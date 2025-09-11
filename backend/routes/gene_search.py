# © Mohsen Yousefzadeh Najafabadi, August 30 2025
# All rights reserved. Unauthorized use, distribution, or modification prohibited.


from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
from typing import List, Optional
import os
import numpy as np
from utils.openai_client import create_openai_client
import json

router = APIRouter()

# Load and cache the gene databases
def load_gene_databases():
    try:
        # Try multiple possible paths for the data files
        possible_paths = [
            ('data/NCBI_Filtered_Data_Enriched.csv', 'data/uniprotkb_Phaseolus_vulgaris.csv'),
            ('../data/NCBI_Filtered_Data_Enriched.csv', '../data/uniprotkb_Phaseolus_vulgaris.csv'),
            ('/opt/beangpt/data/NCBI_Filtered_Data_Enriched.csv', '/opt/beangpt/data/uniprotkb_Phaseolus_vulgaris.csv'),
            ('/opt/beangpt/backend/data/NCBI_Filtered_Data_Enriched.csv', '/opt/beangpt/backend/data/uniprotkb_Phaseolus_vulgaris.csv')
        ]
        
        for ncbi_path, uniprot_path in possible_paths:
            try:
                if os.path.exists(ncbi_path) and os.path.exists(uniprot_path):
                    print(f"✅ Loading gene databases from: {ncbi_path}, {uniprot_path}")
                    ncbi_data = pd.read_csv(ncbi_path)
                    uniprot_data = pd.read_csv(uniprot_path)
                    print(f"✅ Successfully loaded {len(ncbi_data)} NCBI records and {len(uniprot_data)} UniProt records")
                    return ncbi_data, uniprot_data
            except Exception as e:
                print(f"⚠️ Failed to load from {ncbi_path}: {e}")
                continue
        
        print("❌ Could not find gene database files in any expected location")
        return None, None
        
    except Exception as e:
        print(f"❌ Error loading gene databases: {e}")
        return None, None

# Load databases on startup
print("🔄 Initializing gene databases...")
ncbi_data, uniprot_data = load_gene_databases()

if ncbi_data is None and uniprot_data is None:
    print("⚠️ WARNING: Gene databases not loaded. Gene search will only work with AI descriptions.")

class GeneSearchRequest(BaseModel):
    query: str
    api_key: Optional[str] = None

class GeneReference(BaseModel):
    title: str
    url: str

class GeneResult(BaseModel):
    id: str
    name: str
    source: str
    description: str
    aliases: Optional[List[str]] = None
    functions: Optional[List[str]] = None
    references: Optional[List[GeneReference]] = None

def search_bean_databases(query: str):
    results = []
    
    # Normalize query
    query_lower = query.lower().strip()
    
    # Search NCBI database
    if ncbi_data is not None:
        ncbi_matches = ncbi_data[
            ncbi_data['Symbol'].str.lower().str.contains(query_lower, na=False) |
            ncbi_data['Description'].str.lower().str.contains(query_lower, na=False) |
            ncbi_data['FullGeneName'].str.lower().str.contains(query_lower, na=False)
        ]
        
        for _, row in ncbi_matches.iterrows():
            results.append({
                'id': str(row['GeneID']),
                'name': row['Symbol'],
                'source': 'NCBI',
                'description': row['Description'],
                'full_name': row.get('FullGeneName', ''),
                'aliases': [],  # No aliases column in this format
                'references': [
                    {'title': 'View in NCBI', 'url': f"https://www.ncbi.nlm.nih.gov/gene/{row['GeneID']}"}
                ]
            })
    
    # Search UniProt database
    if uniprot_data is not None:
        # Build search conditions for available columns
        search_conditions = []
        
        # Check which columns exist and build search conditions
        if 'Entry' in uniprot_data.columns:
            search_conditions.append(uniprot_data['Entry'].str.lower().str.contains(query_lower, na=False))
        
        if 'Protein names' in uniprot_data.columns:
            search_conditions.append(uniprot_data['Protein names'].str.lower().str.contains(query_lower, na=False))
        
        # Search in Gene Names columns
        for col in ['Gene Names', 'Gene Names (primary)', 'Gene Names (synonym)']:
            if col in uniprot_data.columns:
                search_conditions.append(uniprot_data[col].str.lower().str.contains(query_lower, na=False))
        
        # Combine all search conditions
        if search_conditions:
            combined_condition = search_conditions[0]
            for condition in search_conditions[1:]:
                combined_condition = combined_condition | condition
            
            uniprot_matches = uniprot_data[combined_condition]
            
            for _, row in uniprot_matches.iterrows():
                results.append({
                    'id': row.get('Entry', ''),
                    'name': row.get('Entry Name', row.get('Entry', '')),
                    'source': 'UniProt',
                    'description': row.get('Protein names', ''),
                    'gene_names': row.get('Gene Names', ''),
                    'references': [
                        {'title': 'View in UniProt', 'url': f"https://www.uniprot.org/uniprot/{row.get('Entry', '')}"}
                    ]
                })
    
    return results

def generate_ai_description(query: str, api_key: str):
    client = create_openai_client(api_key)
    
    try:
        # First, check if this might be a human gene
        check_response = client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=[
                {"role": "system", "content": "You are a gene expert. Determine if this query is likely referring to a human gene or a bean (Phaseolus vulgaris) gene. Respond in JSON format with fields: is_human_gene (boolean), explanation (string)."},
                {"role": "user", "content": f"Is this likely a human gene: {query}"}
            ],
            temperature=0.1,
            max_tokens=200,
            response_format={ "type": "json_object" }
        )
        
        check_result = check_response.choices[0].message.content
        check_data = json.loads(check_result)
        
        # Generate the description with context from the check
        response = client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=[
                {"role": "system", "content": """You are a specialized gene research assistant focused on Phaseolus vulgaris (common bean) genetics.
                Generate a detailed, PhD-level description of the gene or gene family, focusing on its role in bean biology.
                If this appears to be a human gene, suggest related bean genes or homologs.
                
                Response must be valid JSON with the following structure:
                {
                    "sections": [
                        {
                            "title": "Gene Overview",
                            "content": "Technical overview of gene structure, family, and key characteristics"
                        },
                        {
                            "title": "Molecular Function",
                            "content": "Detailed description of molecular mechanisms and biochemical functions"
                        },
                        {
                            "title": "Expression & Regulation",
                            "content": "Expression patterns, regulatory mechanisms, and pathway interactions"
                        },
                        {
                            "title": "Phenotypic Effects",
                            "content": "Impact on plant development, stress responses, or other phenotypes"
                        },
                        {
                            "title": "Research Context",
                            "content": "Current research status and significance in bean biology"
                        }
                    ],
                    "molecular_details": {
                        "domains": ["List of key protein domains"],
                        "interactions": ["Known protein-protein or molecular interactions"],
                        "pathways": ["Associated metabolic or signaling pathways"]
                    },
                    "is_bean_specific": true/false,
                    "suggested_bean_genes": ["PvGene1", "PvGene2"],
                    "technical_notes": "Additional technical details relevant for researchers"
                }
                
                Guidelines:
                1. Use proper gene nomenclature (e.g., PvNAC1, not NAC1)
                2. Include specific molecular mechanisms and pathways
                3. Reference protein domains and structural features
                4. Discuss regulatory networks and interactions
                5. Focus on bean-specific research context
                6. Use technical, PhD-level terminology
                7. Avoid generic descriptions - be specific and detailed
                8. Include quantitative data where relevant (e.g., expression fold changes)"""},
                {"role": "user", "content": f"Gene query: {query}\nPreliminary analysis: {check_result}"}
            ],
            temperature=0.2,
            max_tokens=1500,
            response_format={ "type": "json_object" }
        )
        
        result = response.choices[0].message.content
        return json.loads(result)
    except Exception as e:
        print(f"Error generating AI description: {e}")
        print(f"Response content: {response.choices[0].message.content if 'response' in locals() else 'No response'}")
        return None

@router.options("/gene-search")
async def gene_search_options():
    """Handle CORS preflight requests"""
    return {"message": "CORS preflight OK"}

@router.post("/gene-search")
async def search_genes(request: GeneSearchRequest):
    try:
        print(f"🔍 Gene search request: {request.query}")
        
        if not request.query:
            raise HTTPException(status_code=400, detail="Search query is required")
        
        # Search databases first
        database_results = search_bean_databases(request.query)
        print(f"📊 Database search returned {len(database_results)} results")
        
        # If databases aren't loaded, inform the user
        if ncbi_data is None and uniprot_data is None:
            print(f"⚠️ Gene databases not available, query: {request.query}")
        
        # If no results found and API key provided, generate AI description
        if not database_results and request.api_key:
            print(f"🤖 No database results, trying AI generation for: {request.query}")
            ai_result = generate_ai_description(request.query, request.api_key)
            if ai_result:
                print(f"✅ AI generation successful")
                # Create a synthetic result from AI description
                result_data = {
                    'id': 'ai_generated',
                    'name': request.query,
                    'source': 'AI Analysis',
                    'is_bean_specific': ai_result.get('is_bean_specific', False),
                    'suggested_bean_genes': ai_result.get('suggested_bean_genes', [])
                }
                
                # Add structured sections if available
                if 'sections' in ai_result:
                    result_data['sections'] = ai_result['sections']
                if 'molecular_details' in ai_result:
                    result_data['molecular_details'] = ai_result['molecular_details']
                if 'technical_notes' in ai_result:
                    result_data['technical_notes'] = ai_result['technical_notes']
                
                # Fallback for simple description
                if 'description' in ai_result and 'sections' not in ai_result:
                    result_data['description'] = ai_result['description']
                    
                database_results.append(result_data)
            else:
                print(f"❌ AI generation failed")
        
        print(f"📤 Returning {len(database_results)} total results")
        return database_results
        
    except Exception as e:
        print(f"❌ Error in gene search endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/gene-search/health")
async def gene_search_health():
    """Health check endpoint for gene search functionality"""
    try:
        import pandas as pd
        import numpy as np
        pandas_version = pd.__version__
        numpy_version = np.__version__
        
        return {
            "status": "ok",
            "pandas_version": pandas_version,
            "numpy_version": numpy_version,
            "ncbi_loaded": ncbi_data is not None,
            "uniprot_loaded": uniprot_data is not None,
            "ncbi_records": len(ncbi_data) if ncbi_data is not None else 0,
            "uniprot_records": len(uniprot_data) if uniprot_data is not None else 0,
            "message": "Gene search is operational" if (ncbi_data is not None or uniprot_data is not None) else "Gene databases not loaded - only AI search available",
            "current_directory": os.getcwd(),
            "data_files_exist": {
                "data/NCBI_Filtered_Data_Enriched.csv": os.path.exists("data/NCBI_Filtered_Data_Enriched.csv"),
                "../data/NCBI_Filtered_Data_Enriched.csv": os.path.exists("../data/NCBI_Filtered_Data_Enriched.csv"),
                "/opt/beangpt/data/NCBI_Filtered_Data_Enriched.csv": os.path.exists("/opt/beangpt/data/NCBI_Filtered_Data_Enriched.csv")
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "message": "Gene search health check failed"
        }

@router.get("/gene-search/test")
async def gene_search_test():
    """Simple test endpoint to verify gene search is working"""
    try:
        return {
            "status": "ok", 
            "message": "Gene search endpoint is responding - UPDATED VERSION",
            "test_query_result": "This endpoint is working",
            "timestamp": "2024-12-19",
            "version": "v2.0"
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

@router.get("/gene-search/debug/{query}")
async def gene_search_debug(query: str):
    """Debug endpoint to test gene search without POST"""
    try:
        print(f"🔍 DEBUG: Gene search request: {query}")
        
        # Test the search_bean_databases function directly
        database_results = search_bean_databases(query)
        print(f"📊 DEBUG: Database search returned {len(database_results)} results")
        
        return {
            "status": "ok",
            "query": query,
            "results_count": len(database_results),
            "results": database_results[:3] if database_results else [],  # First 3 results only
            "message": "Debug search completed successfully"
        }
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ DEBUG ERROR: {e}")
        print(f"📋 DEBUG TRACEBACK: {error_details}")
        
        return {
            "status": "error",
            "query": query,
            "error": str(e),
            "traceback": error_details,
            "message": "Debug search failed"
        }

@router.get("/gene-search/columns")
async def gene_search_columns():
    """Debug endpoint to show what columns exist in the databases"""
    try:
        result = {
            "status": "ok",
            "ncbi_loaded": ncbi_data is not None,
            "uniprot_loaded": uniprot_data is not None
        }
        
        # Safely check NCBI data
        if ncbi_data is not None:
            try:
                result["ncbi_columns"] = list(ncbi_data.columns)
                result["ncbi_shape"] = ncbi_data.shape
                result["ncbi_dtypes"] = str(ncbi_data.dtypes.to_dict())
            except Exception as e:
                result["ncbi_error"] = str(e)
        else:
            result["ncbi_error"] = "NCBI data is None"
        
        # Safely check UniProt data  
        if uniprot_data is not None:
            try:
                result["uniprot_columns"] = list(uniprot_data.columns)
                result["uniprot_shape"] = uniprot_data.shape
                result["uniprot_dtypes"] = str(uniprot_data.dtypes.to_dict())
            except Exception as e:
                result["uniprot_error"] = str(e)
        else:
            result["uniprot_error"] = "UniProt data is None"
        
        return result
        
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc()
        }
