#!/usr/bin/env python3
"""
Test script for the new market class filtering logic
"""

import pandas as pd

# Mock data to simulate different market classes
mock_data = pd.DataFrame({
    'Market Class': [
        'kidney', 'dark red kidney', 'light red kidney', 'white kidney',
        'navy', 'black', 'cranberry', 'kidney', 'dark red kidney'
    ],
    'Cultivar Name': ['Test1', 'Test2', 'Test3', 'Test4', 'Test5', 'Test6', 'Test7', 'Test8', 'Test9']
})

print('Mock dataset:')
print(mock_data['Market Class'].value_counts())
print()

# Test the new filtering logic
test_queries = ['kidney', 'dark red kidney', 'navy']

for query in test_queries:
    print(f'Query: "{query}"')

    # Simulate the new logic
    if query.lower() in ['kidney', 'kidney bean']:
        # First try exact match for 'kidney'
        exact_kidney = mock_data[mock_data['Market Class'].str.lower().str.strip() == 'kidney']
        if not exact_kidney.empty:
            filtered = exact_kidney
            print(f'  -> Found exact matches: {len(filtered)} records')
        else:
            # Fall back to contains matching
            filtered = mock_data[mock_data['Market Class'].str.contains('kidney', case=False, na=False)]
            print(f'  -> No exact matches, showing subtypes: {len(filtered)} records')
    elif query.lower() in ['dark red kidney', 'dark red kidney bean', 'red kidney']:
        filtered = mock_data[mock_data['Market Class'].str.lower().str.strip() == 'dark red kidney']
        print(f'  -> Exact dark red kidney matches: {len(filtered)} records')
    elif query.lower() in ['navy', 'white navy', 'navy bean']:
        filtered = mock_data[mock_data['Market Class'].str.lower().str.strip() == 'navy']
        print(f'  -> Exact navy matches: {len(filtered)} records')
    else:
        filtered = mock_data[mock_data['Market Class'].str.contains(query, case=False, na=False)]
        print(f'  -> Contains matches: {len(filtered)} records')

    if not filtered.empty:
        print(f'  -> Results: {filtered["Market Class"].tolist()}')
    print()
