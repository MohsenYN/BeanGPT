// © Mohsen Yousefzadeh Najafabadi, August 30 2025 
// All rights reserved. Unauthorized use, distribution, or modification prohibited. 

import React, { useState, useRef, useEffect } from 'react';
import { 
  FaDna, FaFlask, FaMoon, FaSun, FaPaperPlane, FaSpinner, 
  FaChevronDown, FaChevronUp, FaHistory, FaBookmark, 
  FaSearch, FaChartBar, FaDatabase, FaFileAlt, FaMicroscope,
  FaCaretRight, FaExternalLinkAlt, FaClipboard, FaBook, FaTimes,
  FaBars, FaArrowLeft
} from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import remarkGfm from 'remark-gfm';
import PlotlyChart from './components/PlotlyChart.jsx';
import ApiKeyInput from './components/ApiKeyInput.jsx';
import { API_ENDPOINTS } from './config.js';
import GeneSearch from './components/GeneSearch.jsx';
import FeedbackWidget from './components/FeedbackWidget.jsx';

const initialMessages = [
  {
    sender: 'assistant',
    text: `# **👩‍🔬 Welcome to BeanGPT!**

### **Your AI-Powered Partner for Bean Breeding & Computational Biology**

---

BeanGPT is a next-generation, domain-specialized large language model built to boost research in bean breeding and computational biology. 

Trained on over **100 million words** from a curated collection of more than **300,000 peer-reviewed papers** from Web of Science and PubMed, OPCC field trial datasets from Ontario, technical reports, and multi-omics resources, BeanGPT provides deep and comprehensive coverage of the scientific landscape. 

With a broad representation of over **42 scientific and common names** across major species, including *Phaseolus*, *Glycine*, *Vicia*, *Lens*, *Pisum*, and *Lupinus*, BeanGPT uses advanced generative AI to support hypothesis generation, data synthesis, and literature insights, accelerating progress in bean research and crop improvement.

---

## **How Can You Use BeanGPT?**

**🔬 Explore Genes and Traits**  
Ask about genes, traits, proteins, and other multi-omics features, targeted to specific regions or populations of interest.

**📊 Analyze Field Trials**  
Query historical field trial summaries for particular cultivars and locations to compare performance and adaptation.

**📚 Request Literature Reviews**  
Get concise, citation-backed literature syntheses on resistance genes, agronomic traits, or other key topics.

**📈 Visualize and Predict**  
Visualize performance trends or predict genotype responses to new environments using integrated scientific data.

**🌱 Access Breeding Guidance**  
Receive best-practice breeding recommendations, informed by both global advances and local research findings.

---

### 🚀 **Ready to Accelerate Your Bean Breeding Research?**
Type your question or upload your data below, let BeanGPT do the heavy lifting!

### 🌟 **Built by computational plant breeders for a wide range of scientists and researchers.**`,
    isWelcome: true
  }
];

export default function App() {
  // Main app state - v2
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [darkMode, setDarkMode] = useState(() =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  
  // Mobile-first responsive state management
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 1024);
  const [activeView, setActiveView] = useState('chat');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  // Session and UI state
  const [currentSession, setCurrentSession] = useState('Research Session 1');
  const chatEndRef = useRef(null);
  const [showSuggestedQuestions, setShowSuggestedQuestions] = useState({});
  const [showGenePanel, setShowGenePanel] = useState({});
  
  // Dynamic loading steps state
  const [dynamicLoadingSteps, setDynamicLoadingSteps] = useState([]);
  
  // Modal states
  const [showGeneSearchModal, setShowGeneSearchModal] = useState(false);
  const [showResourcesModal, setShowResourcesModal] = useState(false);
  
  // API key state
  const [userApiKey, setUserApiKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState('none'); // 'none', 'valid', 'invalid'

  // Feedback submission handler
  const handleFeedbackSubmit = async (feedbackData) => {
    try {
      const response = await fetch(API_ENDPOINTS.FEEDBACK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Feedback submitted successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      throw error;
    }
  };

  // Handle ESC key for modals
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showGeneSearchModal) {
          setShowGeneSearchModal(false);
        } else if (showResourcesModal) {
          setShowResourcesModal(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showGeneSearchModal, showResourcesModal]);

  // Handle API key changes from the ApiKeyInput component
  const handleApiKeyChange = (apiKey) => {
    setUserApiKey(apiKey);
    if (apiKey) {
      setApiKeyStatus('valid');
    } else {
      setApiKeyStatus('none');
    }
  };

  // Handle API key validation errors
  const handleApiKeyError = () => {
    setApiKeyStatus('invalid');
    setUserApiKey('');
    if (window.handleApiKeyError) {
      window.handleApiKeyError();
    }
  };

  // Handle responsive breakpoints
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      
      // Auto-collapse sidebar on mobile/tablet
      if (width < 1024) {
        setSidebarCollapsed(true);
        setShowMobileSidebar(false);
      } else {
        setSidebarCollapsed(false);
        setShowMobileSidebar(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMobileSidebar && !event.target.closest('.mobile-sidebar') && !event.target.closest('.mobile-menu-button')) {
        setShowMobileSidebar(false);
      }
    };

    if (showMobileSidebar) {
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showMobileSidebar]);

  // Custom styles for better prose formatting
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .prose-compact {
        line-height: 1.6 !important;
      }
      .prose-compact p {
        margin-bottom: 0.75rem !important;
        margin-top: 0 !important;
      }
      .prose-compact ul, .prose-compact ol {
        margin-bottom: 0.75rem !important;
        margin-top: 0 !important;
      }
      .prose-compact li {
        margin-bottom: 0.25rem !important;
        margin-top: 0 !important;
      }
      .prose-compact h1, .prose-compact h2, .prose-compact h3 {
        margin-bottom: 0.75rem !important;
      }
      .prose-compact blockquote {
        margin-bottom: 0.75rem !important;
        margin-top: 0 !important;
      }
      .prose-compact pre {
        margin-bottom: 0.75rem !important;
        margin-top: 0 !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Convert messages to conversation history format for the API
  const getConversationHistory = () => {
    return messages.filter(msg => !msg.isWelcome).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));
  };

  // Handle research continuation when user clicks the toggle
  const handleContinueResearch = async (originalQuestion, messageIndex) => {
    // Check if API key is available and valid
    if (apiKeyStatus !== 'valid') {
      console.error('No valid API key available for research continuation');
      return;
    }
    
    try {
      // Capture the current message content before starting
      const currentMessage = messages[messageIndex];
      const originalMessageContent = currentMessage.text;
      
      setIsLoading(true);
      setIsStreaming(true);
      setStreamingText('');

              const response = await fetch(API_ENDPOINTS.CONTINUE_RESEARCH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: originalQuestion,
          conversation_history: getConversationHistory(),
          api_key: userApiKey
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let researchText = '';
      let buffer = '';



      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr) continue;
                
                const data = JSON.parse(jsonStr);
                
                if (data.type === 'content') {
                  setIsLoading(false);
                  researchText += data.data;
                  setStreamingText(researchText);
                } else if (data.type === 'progress') {
                  // Handle progress updates from continue research
                  if (data.data.step === 'gene_extraction') {
                    setIsStreaming(false);
                    setIsPostProcessing(true);
                    setPostProcessingStep(0);
                  } else if (data.data.step === 'gene_processing') {
                    setIsPostProcessing(true);
                    setPostProcessingStep(1);
                  } else if (data.data.step === 'sources') {
                    setIsPostProcessing(true);
                    setPostProcessingStep(2);
                  } else if (data.data.step === 'finalizing') {
                    setIsPostProcessing(true);
                    setPostProcessingStep(3);
                  }
                } else if (data.type === 'error') {
                  // Handle API key errors and other errors
                  setIsLoading(false);
                  setIsStreaming(false);
                  setStreamingText('');
                  
                  if (data.data && (data.data.includes('API key') || data.data.includes('Invalid API key'))) {
                    handleApiKeyError();
                  }
                  
                  // Show error message
                  setMessages(prev => prev.map((msg, idx) => {
                    if (idx === messageIndex) {
                      return {
                        ...msg,
                        text: originalMessageContent,
                        showResearchToggle: false
                      };
                    }
                    return msg;
                  }));
                  
                  // Add error message
                  setMessages(prev => [...prev, {
                    sender: 'assistant',
                    text: `❌ **Error**: ${data.data}`,
                    timestamp: new Date()
                  }]);
                  break;
                } else if (data.type === 'metadata') {
                  setIsStreaming(false);
                  
                  // Update the message to include research results - use captured original content
                  setMessages(prev => prev.map((msg, idx) => {
                    if (idx === messageIndex) {
                      return {
                        ...msg,
                        text: originalMessageContent + researchText, // Original content + complete research text
                        sources: data.data.sources || [], // Add sources from research
                        genes: data.data.genes || [], // Add genes from research
                        showResearchToggle: false // Hide the toggle after completion
                      };
                    }
                    return msg;
                  }));
                  
                  setStreamingText('');
                } else if (data.type === 'done') {
                  break;
                }
              } catch (e) {
                console.error('Error parsing research continuation data:', e);
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Error continuing with research:', error);
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingText('');
      
      // On error, just hide the toggle without adding research content
      setMessages(prev => prev.map((msg, idx) => {
        if (idx === messageIndex) {
          return {
            ...msg,
            text: originalMessageContent, // Restore original content
            showResearchToggle: false
          };
        }
        return msg;
      }));
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fix overscroll background color
  useEffect(() => {
    const backgroundColor = darkMode ? '#04060f' : '#e0eafc';
    document.body.style.backgroundColor = backgroundColor;
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.backgroundColor = backgroundColor;
    document.documentElement.style.overscrollBehavior = 'none';
    
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.backgroundColor = '';
      document.documentElement.style.overscrollBehavior = '';
    };
  }, [darkMode]);

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isPostProcessing, setIsPostProcessing] = useState(false);
  const [postProcessingStep, setPostProcessingStep] = useState(0);
  const [actualPaperCount, setActualPaperCount] = useState(null);
  const [queryType, setQueryType] = useState('research'); // 'research', 'dataset', or 'mixed'

  // Dynamic loading steps based on query type
  const getLoadingSteps = () => {
    const baseSteps = [
      { step: "Thinking", detail: "Processing your question...", icon: "💭" },
      { step: "Analyzing query", detail: "Determining optimal search strategy", icon: "🤔" },
      { step: "Processing embeddings", detail: "Converting query to semantic vectors", icon: "🧮" }
    ];

    if (queryType === 'dataset') {
      return [
        ...baseSteps,
        { step: "Searching dataset", detail: "Querying cultivar performance database", icon: "🗃️" },
        { step: "Processing results", detail: "Analyzing and formatting data", icon: "📊" },
        { step: "Generating response", detail: "Creating comprehensive analysis", icon: "🧠" },
        { step: "Finalizing output", detail: "Preparing charts and summaries", icon: "✨" }
      ];
    } else if (queryType === 'mixed') {
      return [
        ...baseSteps,
        { step: "Checking dataset", detail: "Searching cultivar performance data", icon: "🗃️" },
        { step: "Searching literature", detail: "Querying research paper database", icon: "🔍" },
        { step: "Retrieving papers", detail: actualPaperCount ? `Found ${actualPaperCount} relevant papers` : "Collecting research papers", icon: "📚" },
        { step: "Processing context", detail: "Extracting key information", icon: "📄" },
        { step: "Generating response", detail: "Synthesizing findings with AI", icon: "🧠" },
        { step: "Analyzing genetics", detail: "Identifying genes and markers", icon: "🧬" },
        { step: "Finalizing output", detail: "Formatting final response", icon: "✨" }
      ];
    } else {
      // Pure research query
      return [
        ...baseSteps,
        { step: "Searching literature", detail: "Querying research paper database", icon: "🔍" },
        { step: "Retrieving papers", detail: actualPaperCount ? `Found ${actualPaperCount} relevant papers` : "Collecting research papers", icon: "📚" },
        { step: "Processing context", detail: "Extracting abstracts and summaries", icon: "📄" },
        { step: "Generating response", detail: "Synthesizing findings with AI", icon: "🧠" },
        { step: "Analyzing genetics", detail: "Identifying genes and markers", icon: "🧬" },
        { step: "Finalizing output", detail: "Formatting final response", icon: "✨" }
      ];
    }
  };

  const postProcessingSteps = [
    { text: "🧬 Extracting genetic elements...", icon: "🧬" },
    { text: "📚 Processing source references...", icon: "📚" },
    { text: "💡 Generating follow-up questions...", icon: "💡" },
    { text: "✅ Finalizing response...", icon: "✅" }
  ];

  useEffect(() => {
    let timeouts = [];
    if (isLoading) {
      setCurrentStep(0);
      setCompletedSteps([]);
      setDynamicLoadingSteps([]); // Reset dynamic loading steps
      
      // The thinking step will be triggered immediately by backend
      // No need for frontend timing since backend sends "thinking" progress immediately
    } else {
      // Reset when loading stops
      setCurrentStep(0);
      setCompletedSteps([]);
      setDynamicLoadingSteps([]); // Reset dynamic loading steps
    }

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsgText = input;
    const userMsg = { sender: 'user', text: userMsgText, timestamp: new Date() };

    // Hide any existing research toggles when asking a new question
    setMessages((msgs) => [
      ...msgs.map(msg => ({ ...msg, showResearchToggle: false })),
      userMsg
    ]);
    setInput('');
    
    // Reset states
    setActualPaperCount(null);
    
    // Detect query type based on keywords
    const lowerInput = userMsgText.toLowerCase();
    const datasetKeywords = ['yield', 'cultivar', 'variety', 'performance', 'average', 'comparison', 'trial', 'location', 'maturity'];
    const hasDatasetKeywords = datasetKeywords.some(keyword => lowerInput.includes(keyword));
    
    if (hasDatasetKeywords) {
      setQueryType('mixed'); // Start with mixed, may change to dataset if data is found
    } else {
      setQueryType('research');
    }
    
    setIsLoading(true);

    // Start the actual request immediately, let backend progress drive the UI
    try {
      // Keep loading true until we start receiving content
      // setIsLoading(false); // Remove this - keep loading until content starts
      
      // Small delay to show initial thinking step
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsStreaming(true);
      setStreamingText('');

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 300000); // 5 minute timeout

      const response = await fetch(API_ENDPOINTS.CHAT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMsgText,
          conversation_history: getConversationHistory(),
          api_key: userApiKey
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = ''; // Buffer to accumulate incomplete JSON

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          buffer += chunk;
          const lines = buffer.split('\n');
          
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr) continue; // Skip empty lines
                
                const data = JSON.parse(jsonStr);
                
                if (data.type === 'content') {
                  // First content received - immediately stop loading and start streaming display
                  setIsLoading(false);
                  
                  fullText += data.data;
                  setStreamingText(fullText);
                  
                  // Update query type based on response content
                  if (fullText.includes('Dataset Search Results') || fullText.includes('cultivar performance dataset')) {
                    setQueryType('mixed');
                  } else if (fullText.includes('Yearly Average') || fullText.includes('Bean Type Analysis')) {
                    setQueryType('dataset');
                  }
                } else if (data.type === 'progress') {
                  // Handle progress updates from backend
                  console.log('🔄 Progress update received:', data.data.step, data.data.detail);
                  
                  if (data.data.paper_count) {
                    setActualPaperCount(data.data.paper_count);
                  }
                  
                  // Update loading step based on backend progress
                  const currentSteps = getLoadingSteps();
                  
                  // Initialize dynamic steps if not set
                  if (dynamicLoadingSteps.length === 0) {
                    setDynamicLoadingSteps([...currentSteps]);
                  }
                  
                  // Create a dynamic step directly from backend data
                  const createDynamicStep = (step, detail) => {
                    const stepIcons = {
                      'thinking': '💭',
                      'analysis': '🤔', 
                      'loading': '🗃️',
                      'processing': '📊',
                      'web_search': '🔍',
                      'ai_summary': '🧠',
                      'streaming': '✨',
                      'dataset': '🗃️',
                      'dataset_success': '✅'
                    };
                    
                    return {
                      step: detail.split('...')[0] + '...' || step,
                      detail: detail,
                      icon: stepIcons[step] || '⚙️'
                    };
                  };

                  if (data.data.step === 'thinking') {
                    // Initial thinking step
                    const thinkingStep = createDynamicStep('thinking', data.data.detail || 'Processing your question...');
                    console.log('🔄 Setting thinking step:', thinkingStep);
                    setCurrentStep(0);
                    setCompletedSteps([]);
                    setDynamicLoadingSteps([thinkingStep]);
                  } else {
                    // For all other steps, add them dynamically
                    const newStep = createDynamicStep(data.data.step, data.data.detail);
                    console.log('🔄 Adding dynamic step:', newStep);
                    
                    setDynamicLoadingSteps(prev => {
                      const newSteps = [...prev];
                      
                      // Find if this step type already exists
                      const existingIndex = newSteps.findIndex(s => s.step.includes(newStep.step.split('...')[0]));
                      
                      if (existingIndex >= 0) {
                        // Update existing step
                        newSteps[existingIndex] = newStep;
                        setCurrentStep(existingIndex);
                      } else {
                        // Add new step
                        newSteps.push(newStep);
                        setCurrentStep(newSteps.length - 1);
                        // Mark previous step as completed
                        if (newSteps.length > 1) {
                          setCompletedSteps(prev => [...prev, newSteps.length - 2]);
                        }
                      }
                      
                      return newSteps;
                    });
                  }
                  
                  // Handle special cases that affect query type
                  if (data.data.step === 'dataset_success') {
                    setQueryType('dataset');
                  } else if (data.data.step === 'fallback' || data.data.step === 'error_fallback') {
                    setQueryType('mixed');
                  }
                  
                  // Handle post-processing steps
                  if (data.data.step === 'gene_extraction') {
                    setIsStreaming(false);
                    setIsPostProcessing(true);
                    setPostProcessingStep(0);
                  } else if (data.data.step === 'gene_processing') {
                    setIsPostProcessing(true);
                    setPostProcessingStep(1);
                  } else if (data.data.step === 'sources') {
                    setIsPostProcessing(true);
                    setPostProcessingStep(2);
                  }
                } else if (data.type === 'error') {
                  // Handle API key errors and other errors
                  setIsLoading(false);
                  setIsStreaming(false);
                  setIsPostProcessing(false);
                  
                  if (data.data && (data.data.includes('API key') || data.data.includes('Invalid API key'))) {
                    handleApiKeyError();
                  }
                  
                  // Add error message
                  setMessages(prev => [...prev, {
                    sender: 'assistant',
                    text: `❌ **Error**: ${data.data}`,
                    timestamp: new Date()
                  }]);
                  break;
                } else if (data.type === 'bean_complete') {
                  console.log('🎯 Frontend received bean_complete message');
                  console.log('📊 Chart data in bean_complete:', data.data.chart_data);
                  console.log('📋 Full data object:', data.data);
                  
                  // Bean data analysis is complete, show toggle for research continuation
                  setIsLoading(false);
                  setIsStreaming(false);
                  
                  setMessages(prev => [...prev, {
                    sender: 'assistant',
                    text: fullText,
                    sources: [],
                    genes: [],
                    fullMarkdownTable: data.data.full_markdown_table,
                    suggestedQuestions: [],
                    chartData: data.data.chart_data,
                    timestamp: new Date(),
                    showResearchToggle: true, // Flag to show the research toggle
                    originalQuestion: userMsgText // Store the original question for research continuation
                  }]);
                  
                  console.log('✅ Message added to state with chartData:', data.data.chart_data);
                  
                  setStreamingText('');
                  return; // Stop processing here
                  
                } else if (data.type === 'metadata') {
                  // Update actual paper count
                  if (data.data.sources && data.data.sources.length > 0) {
                    setActualPaperCount(data.data.sources.length);
                  }
                  
                  // Start post-processing phase
                  setIsStreaming(false);
                  setIsPostProcessing(true);
                  setPostProcessingStep(0);

                  // Simulate post-processing steps with realistic timing
                  const processSteps = async () => {
                    const stepDurations = [800, 600, 400, 300]; // Duration for each step in ms
                    
                    for (let i = 0; i < postProcessingSteps.length; i++) {
                      setPostProcessingStep(i);
                      await new Promise(resolve => setTimeout(resolve, stepDurations[i]));
                    }
                    
                    // Complete post-processing
                    setIsPostProcessing(false);
                  };

                  processSteps().then(() => {
                    // Add final message with metadata after post-processing
                    
                    let assistantMarkdown = fullText;

                    // Don't append sources to markdown - we'll render them separately

                    // Complete Dataset section removed per user request
                    // if (data.data.full_markdown_table) {
                    //   assistantMarkdown += '\n\n---\n## 📊 **Complete Dataset**\n' + data.data.full_markdown_table;
                    // }

                    setMessages(prev => [...prev, {
                      sender: 'assistant',
                      text: assistantMarkdown,
                      sources: data.data.sources,
                      genes: data.data.genes,
                      fullMarkdownTable: data.data.full_markdown_table,
                      suggestedQuestions: data.data.suggested_questions,
                      chartData: data.data.chart_data,
                      timestamp: new Date()
                    }]);

                    if (data.data.suggested_questions && data.data.suggested_questions.length > 0) {
                      const newMessageIndex = messages.length;
                      setShowSuggestedQuestions(prevState => ({
                        ...prevState,
                        [newMessageIndex]: false
                      }));
                    }

                    setStreamingText('');
                  });
                } else if (data.type === 'done') {
                  break;
                }
              } catch (e) {
                console.error('Error parsing streaming data:', e, 'Line:', line);
                // Don't break on parsing errors, just skip the malformed line
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      setIsStreaming(false);
      setIsPostProcessing(false);
      
      let errorMessage = '❌ **Connection Error**\n\nUnable to reach the research database. Please check your connection and try again.';
      
      if (error.name === 'AbortError') {
        errorMessage = '⏱️ **Request Timeout**\n\nThe request took too long to complete. Please try again with a simpler query or check your connection.';
      } else if (error.message.includes('JSON')) {
        errorMessage = '🔧 **Data Processing Error**\n\nThere was an issue processing the response. Please try your query again.';
      }
      
      setMessages((msgs) => [
        ...msgs,
        {
          sender: 'assistant',
          text: errorMessage,
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoadingMessage('');
      setIsLoading(false);
      setIsStreaming(false);
      setIsPostProcessing(false);
    }
  };

  const quickActions = [
    { 
      icon: FaSearch, 
      label: "Gene Lookup", 
      action: () => setShowGeneSearchModal(true),
      disabled: false,
      tooltip: "Search and analyze bean genes using NCBI and UniProt databases"
    },
    { icon: FaBook, label: "Resources", action: () => setShowResourcesModal(true) }
  ];

  // Helper function to check if text contains inline citations
  const hasInlineCitations = (text) => {
    // Check for patterns like [1], [2], [3] etc. and [Web-1], [Web-2] etc.
    const numericCitationPattern = /\[\d+\]/g;
    const webCitationPattern = /\[Web-\d+\]/g;
    return numericCitationPattern.test(text) || webCitationPattern.test(text);
  };

  return (
    <div className={`h-screen w-screen flex ${darkMode ? 'bg-slate-950' : 'bg-gray-50'} transition-all duration-300 overflow-hidden relative`} style={{
      height: '100vh',
      background: darkMode
        ? 'radial-gradient(ellipse at top left, #0b1230 0%, #04060f 55%)'
        : 'radial-gradient(ellipse at top left, #e0eafc 0%, #dfe7fb 40%, #efe6fb 100%)',
      overscrollBehavior: 'none'
    }}>
      {/* Futuristic ambient backgrounds */}
      <div className="bg-aurora"><div className="blob3"></div></div>
      <div className="bg-grid"></div>

      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${isMobile || isTablet
          ? `fixed top-0 left-0 h-full z-50 transform transition-transform duration-300 ${
              showMobileSidebar ? 'translate-x-0' : '-translate-x-full'
            } w-80 mobile-sidebar`
          : `${sidebarCollapsed ? 'w-16' : 'w-72'} transition-all duration-300`
        }
        glass-strong
        ${isMobile || isTablet ? 'shadow-2xl' : ''}
        flex flex-col relative z-10 overflow-y-auto
      `}>
        {/* Sidebar Header */}
        <div className="p-3 border-b border-slate-900/5 dark:border-white/5">
          <div className="flex items-center justify-between">
            {(!sidebarCollapsed || (isMobile || isTablet)) && (
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center glow-cyan"
                     style={{ background: 'linear-gradient(135deg, rgba(34,211,238,.18), rgba(59,130,246,.18))' }}>
                  <img
                    src={`${import.meta.env.BASE_URL}images/UniversityOfGuelphLogo.png`}
                    alt="University of Guelph"
                    className="w-7 h-7 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-base font-bold gradient-brand tracking-tight leading-none">BeanGPT</h1>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 font-mono tracking-wider uppercase mt-0.5">Powered by Beans</p>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              {/* Mobile close button */}
              {(isMobile || isTablet) && showMobileSidebar && (
                <button
                  onClick={() => setShowMobileSidebar(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <FaTimes className="text-gray-600 dark:text-slate-400" />
                </button>
              )}
            </div>
          </div>
        </div>


              {/* Desktop collapse button */}
              {!isMobile && !isTablet && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors absolute top-4 right-4"
            >
              <FaCaretRight className={`text-gray-500 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
            </button>
              )}
        {/* Session Info */}
        {(!sidebarCollapsed || (isMobile || isTablet)) && (
          <div className="p-3 border-b border-slate-900/5 dark:border-white/5">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-400">
              <FaFlask className="text-blue-500" />
              <span>{currentSession}</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">
              {messages.filter(m => !m.isWelcome).length} interactions
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {(!sidebarCollapsed || (isMobile || isTablet)) && (
          <div className="p-3 border-b border-slate-900/5 dark:border-white/5">
            <h3 className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-[0.18em] mb-3">Quick Research</h3>
            <div className="space-y-2">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.disabled ? undefined : action.action}
                  disabled={action.disabled}
                  title={action.tooltip || ''}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors text-sm ${
                    action.disabled 
                      ? 'cursor-not-allowed bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50' 
                      : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <action.icon className={`text-sm ${
                      action.disabled 
                        ? 'text-amber-500 dark:text-amber-400' 
                        : 'text-blue-500'
                    }`} />
                    <span className={`${
                      action.disabled 
                        ? 'text-amber-700 dark:text-amber-300' 
                        : 'text-gray-700 dark:text-slate-300'
                    }`}>
                      {action.label}
                    </span>
                  </div>
                  {action.status === 'under-repair' && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Under Repair
                      </span>
                    </div>
                  )}
                  {action.disabled && action.status !== 'under-repair' && (
                    <span className="text-xs text-gray-500 dark:text-slate-500">(Coming Soon)</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}



        {/* Data Platform */}

        {(!sidebarCollapsed || (isMobile || isTablet)) && (

          <div className="p-3 border-b border-slate-900/5 dark:border-white/5">

            <h3 className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-[0.18em] mb-3">Platform</h3>

            <div className="space-y-2">

              <button onClick={() => setActiveView('chat')} className={`w-full flex items-center space-x-3 p-2.5 rounded-lg text-left transition-colors text-sm ${activeView === 'chat' ? 'nav-active text-cyan-600 dark:text-cyan-300' : 'hover:bg-slate-900/5 dark:hover:bg-white/5 text-gray-700 dark:text-slate-300'}`}>

                <FaMicroscope className="text-blue-500 text-sm" />

                <span>BeanGPT Chat</span>

              </button>

              <button onClick={() => setActiveView('platform')} className={`w-full flex items-center space-x-3 p-2.5 rounded-lg text-left transition-colors text-sm ${activeView === 'platform' ? 'nav-active text-cyan-600 dark:text-cyan-300' : 'hover:bg-slate-900/5 dark:hover:bg-white/5 text-gray-700 dark:text-slate-300'}`}>

                <FaDatabase className="text-blue-500 text-sm" />

                <span>Data Platform</span>

              </button>

            </div>

          </div>

        )}



        {/* About Us Section */}
        {(!sidebarCollapsed || (isMobile || isTablet)) && (
          <div className="p-3 flex-1">
            <h3 className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-[0.18em] mb-3">About</h3>
            <div className="space-y-4">
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-800/60' : 'bg-white/60'}`}>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Research Platform</h4>
                <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed mb-3">
                  BeanGPT is an AI-powered research platform for dry bean breeding and computational biology, 
                  developed to support sustainable agriculture and breeding research.
                </p>
                
            <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-slate-300">Developed by:</p>
                    <a
                      href="https://www.linkedin.com/in/mohsen-yoosefzadeh-n-82365bb2/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                    >
                      Mohsen Yoosefzadeh Najafabadi
                    </a>
                    <a
                      href="https://www.linkedin.com/in/kiarash-mirkamandari/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                    >
                      Kiarash Mirkamandari
                    </a>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-slate-300">Supervised by:</p>
                    <a 
                      href="https://www.linkedin.com/in/mohsen-yoosefzadeh-n-82365bb2/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                    >
                      Dr. Mohsen Yoosefzadeh Najafabadi
                    </a>
                    <p className="text-xs text-gray-500 dark:text-slate-500">Principal Investigator</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-slate-300">Research Paper:</p>
                    <p className="text-xs text-gray-600 dark:text-slate-400">
                      Currently under review
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700"><p className="text-xs text-gray-500 dark:text-slate-500 leading-relaxed">Thanks to the Research Innovation Office at the University of Guelph for supporting this initiative.</p></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dry Bean Breeding Program Logo */}
        {(!sidebarCollapsed || (isMobile || isTablet)) && (
          <div className="px-3 py-1.5">
            <div className="flex justify-center">
              <img
                src={`${import.meta.env.BASE_URL}images/DryBeanBreedingLogo.png`}
                alt="Dry Bean Breeding & Computational Biology Program"
                className="w-32 h-16 object-contain"
              />
            </div>
          </div>
        )}

        {/* Program Credit */}
        {(!sidebarCollapsed || (isMobile || isTablet)) && (
          <div className="px-3 py-1.5">
            <div className="text-center">
                <a 
                href="https://uogbeans.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                className="text-xs text-gray-600 dark:text-slate-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer font-medium"
                >
                Dry Bean Breeding & Computational Biology Program
                </a>
              <div className="flex items-center justify-center space-x-1 mt-1">
                <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                <span className="text-xs text-gray-600 dark:text-slate-300 font-mono font-medium">University of Guelph</span>
                <div className="w-1 h-1 rounded-full bg-blue-500"></div>
              </div>
            </div>
          </div>
        )}

        {/* Dark Mode Toggle */}
        <div className="p-3 border-t border-slate-900/5 dark:border-white/5">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} p-2 rounded-lg hover:bg-slate-900/5 dark:hover:bg-white/5 transition-colors`}
          >
            {!sidebarCollapsed && (
              <span className="text-sm text-gray-700 dark:text-slate-300">
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
            )}
            {darkMode ? (
              <FaSun className="text-yellow-500 text-lg" />
            ) : (
              <FaMoon className="text-slate-600 text-lg" />
            )}
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col min-h-0 ${isMobile || isTablet ? 'w-full' : ''} relative z-10`} style={{position:"relative"}}>
        {activeView === "platform" && <iframe src="/dry-bean-platform.html" title="Data Platform" style={{position:"absolute",inset:0,width:"100%",height:"100%",border:"none",zIndex:10}} />}
        {/* Header */}
        <div className={`flex-shrink-0 ${isMobile ? 'p-3' : 'px-5 py-3'} glass-strong relative`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Mobile menu button */}
              {(isMobile || isTablet) && (
                <button
                  onClick={() => setShowMobileSidebar(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors mobile-menu-button"
                >
                  <FaBars className="text-gray-600 dark:text-slate-400" />
                </button>
              )}
              <div>
                <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold tracking-tight text-gray-900 dark:text-white leading-none`}>
                  {isMobile ? <span className="gradient-brand">BeanGPT</span> : 'Main Platform'}
                </h2>
                {!isMobile && (
                  <p className="text-gray-600 dark:text-slate-400 text-xs mt-1 font-light">
                    Dry Bean Breeding & Computational Biology
                  </p>
                )}
              </div>
            </div>
            
            <div className={`flex items-center ${isMobile ? 'space-x-2' : 'space-x-6'}`}>
              {/* API Instructions Button */}
              <button
                onClick={() => {
                  const instructions = `
# How to Get Your OpenAI API Key

## Go to OpenAI's website
Visit: https://platform.openai.com

Log in (or create a free account if you don't already have one).

## Set up billing
1. Click on your profile picture (top-right).
2. Go to **Your Profile** and then from the left panel click on **Billing**.
3. Add a payment method by clicking on **Payment Methods**.
4. You only need to add **$5 (USD)** to your account.
5. This should last about **2 months** of normal usage on BeanGPT.

## Get your API key
1. Select **"API Keys"** on the left panel
2. Click **"Create new secret key"** on the top right
3. Copy the key (it will look like a long string of letters and numbers). 
   ⚠️ **Make sure not to lose it as it cannot be seen again!**

## Open BeanGPT
Add the key to BeanGPT

Click **Save**.

## Start using BeanGPT
Once saved, BeanGPT will automatically use your key.

You're ready to start asking questions!
`;
                  const newTab = window.open('', '_blank');
                  newTab.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>BeanGPT - API Key Instructions</title>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <style>
                        body {
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                          line-height: 1.6;
                          color: #333;
                          max-width: 800px;
                          margin: 0 auto;
                          padding: 20px;
                          background-color: #f8f9fa;
                        }
                        .container {
                          background: white;
                          padding: 40px;
                          border-radius: 12px;
                          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        }
                        h1 {
                          color: #2563eb;
                          border-bottom: 3px solid #2563eb;
                          padding-bottom: 10px;
                          margin-bottom: 30px;
                        }
                        h2 {
                          color: #1e40af;
                          margin-top: 30px;
                          margin-bottom: 15px;
                        }
                        ol, ul {
                          margin-left: 20px;
                        }
                        li {
                          margin-bottom: 8px;
                        }
                        strong {
                          color: #1f2937;
                        }
                        code, .code {
                          background-color: #f3f4f6;
                          padding: 2px 6px;
                          border-radius: 4px;
                          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                        }
                        .warning {
                          background-color: #fef3c7;
                          border-left: 4px solid #f59e0b;
                          padding: 15px;
                          margin: 15px 0;
                          border-radius: 4px;
                        }
                        a {
                          color: #2563eb;
                          text-decoration: none;
                        }
                        a:hover {
                          text-decoration: underline;
                        }
                        .footer {
                          margin-top: 40px;
                          padding-top: 20px;
                          border-top: 1px solid #e5e7eb;
                          text-align: center;
                          color: #6b7280;
                          font-size: 14px;
                        }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <h1>🔑 How to Get Your OpenAI API Key</h1>
                        
                        <h2>1. Go to OpenAI's website</h2>
                        <p>Visit: <a href="https://platform.openai.com" target="_blank">https://platform.openai.com</a></p>
                        <p>Log in (or create a free account if you don't already have one).</p>
                        
                        <h2>2. Set up billing</h2>
                        <ol>
                          <li>Click on your profile picture (top-right).</li>
                          <li>Go to <strong>Your Profile</strong> and then from the left panel click on <strong>Billing</strong>.</li>
                          <li>Add a payment method by clicking on <strong>Payment Methods</strong>.</li>
                          <li>You only need to add <strong>$5 (USD)</strong> to your account.</li>
                          <li>This should last about <strong>2 months</strong> of normal usage on BeanGPT.</li>
                        </ol>
                        
                        <h2>3. Get your API key</h2>
                        <ol>
                          <li>Select <strong>"API Keys"</strong> on the left panel</li>
                          <li>Click <strong>"Create new secret key"</strong> on the top right</li>
                          <li>Copy the key (it will look like a long string of letters and numbers).</li>
                        </ol>
                        <div class="warning">
                          <strong>⚠️ Important:</strong> Make sure not to lose it as it cannot be seen again!
                        </div>
                        
                        <h2>4. Add the key to BeanGPT</h2>
                        <ol>
                          <li>Return to BeanGPT</li>
                          <li>Paste your API key in the API key input field</li>
                          <li>Click <strong>Save</strong></li>
                        </ol>
                        
                        <h2>5. Start using BeanGPT</h2>
                        <p>Once saved, BeanGPT will automatically use your key.</p>
                        <p><strong>You're ready to start asking questions!</strong> 🌱</p>
                        
                        <div class="footer">
                          <p>© 2025 BeanGPT. All rights reserved.</p>
                          <p>Return to <a href="javascript:window.close()">BeanGPT</a></p>
                        </div>
                      </div>
                    </body>
                    </html>
                  `);
                  newTab.document.close();
                }}
                className={`flex items-center ${isMobile ? 'px-2 py-1' : 'px-3 py-2'} text-sm gborder rounded-xl text-cyan-600 dark:text-cyan-300 hover:text-cyan-700 dark:hover:text-cyan-200 transition-colors`}
                title="API Key Instructions"
              >
                <svg className={`${isMobile ? 'w-4 h-4' : 'w-4 h-4'} mr-1`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {!isMobile && <span className="font-medium">API Setup</span>}
              </button>
              
              {/* API Key Input - Responsive */}
              <div className={isMobile ? 'hidden' : 'block'}>
              <ApiKeyInput 
                darkMode={darkMode} 
                onApiKeyChange={handleApiKeyChange}
              />
              </div>
              
              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl glass ${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-slate-300`}>
                <div className={`w-2 h-2 rounded-full status-dot ${
                  isLoading ? 'bg-yellow-400 text-yellow-400 animate-pulse' :
                  isStreaming ? 'bg-emerald-400 text-emerald-400 animate-pulse' :
                  isPostProcessing ? 'bg-cyan-400 text-cyan-400 animate-pulse' :
                  apiKeyStatus === 'valid' ? 'bg-emerald-400 text-emerald-400' :
                  apiKeyStatus === 'invalid' ? 'bg-red-400 text-red-400 animate-pulse' :
                  'bg-red-400 text-red-400'
                }`}></div>
                <span className={isMobile ? 'hidden sm:inline' : ''}>
                  {isLoading ? 'Processing' : 
                  isStreaming ? 'Generating' : 
                  isPostProcessing ? 'Analyzing' : 
                  apiKeyStatus === 'valid' ? 'Ready' : 
                  apiKeyStatus === 'invalid' ? 'Invalid API Key' : 
                  'API Key Required'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Mobile API Key Input */}
          {isMobile && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    const newTab = window.open('', '_blank');
                    newTab.document.write(`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <title>BeanGPT - API Key Instructions</title>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                          body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 800px;
                            margin: 0 auto;
                            padding: 20px;
                            background-color: #f8f9fa;
                          }
                          .container {
                            background: white;
                            padding: 40px;
                            border-radius: 12px;
                            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                          }
                          h1 {
                            color: #2563eb;
                            border-bottom: 3px solid #2563eb;
                            padding-bottom: 10px;
                            margin-bottom: 30px;
                          }
                          h2 {
                            color: #1e40af;
                            margin-top: 30px;
                            margin-bottom: 15px;
                          }
                          ol, ul {
                            margin-left: 20px;
                          }
                          li {
                            margin-bottom: 8px;
                          }
                          strong {
                            color: #1f2937;
                          }
                          code, .code {
                            background-color: #f3f4f6;
                            padding: 2px 6px;
                            border-radius: 4px;
                            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                          }
                          .warning {
                            background-color: #fef3c7;
                            border-left: 4px solid #f59e0b;
                            padding: 15px;
                            margin: 15px 0;
                            border-radius: 4px;
                          }
                          a {
                            color: #2563eb;
                            text-decoration: none;
                          }
                          a:hover {
                            text-decoration: underline;
                          }
                          .footer {
                            margin-top: 40px;
                            padding-top: 20px;
                            border-top: 1px solid #e5e7eb;
                            text-align: center;
                            color: #6b7280;
                            font-size: 14px;
                          }
                        </style>
                      </head>
                      <body>
                        <div class="container">
                          <h1>🔑 How to Get Your OpenAI API Key</h1>
                          
                          <h2>1. Go to OpenAI's website</h2>
                          <p>Visit: <a href="https://platform.openai.com" target="_blank">https://platform.openai.com</a></p>
                          <p>Log in (or create a free account if you don't already have one).</p>
                          
                          <h2>2. Set up billing</h2>
                          <ol>
                            <li>Click on your profile picture (top-right).</li>
                            <li>Go to <strong>Your Profile</strong> and then from the left panel click on <strong>Billing</strong>.</li>
                            <li>Add a payment method by clicking on <strong>Payment Methods</strong>.</li>
                            <li>You only need to add <strong>$5 (USD)</strong> to your account.</li>
                            <li>This should last about <strong>2 months</strong> of normal usage on BeanGPT.</li>
                          </ol>
                          
                          <h2>3. Get your API key</h2>
                          <ol>
                            <li>Select <strong>"API Keys"</strong> on the left panel</li>
                            <li>Click <strong>"Create new secret key"</strong> on the top right</li>
                            <li>Copy the key (it will look like a long string of letters and numbers).</li>
                          </ol>
                          <div class="warning">
                            <strong>⚠️ Important:</strong> Make sure not to lose it as it cannot be seen again!
                          </div>
                          
                          <h2>4. Add the key to BeanGPT</h2>
                          <ol>
                            <li>Return to BeanGPT</li>
                            <li>Paste your API key in the API key input field</li>
                            <li>Click <strong>Save</strong></li>
                          </ol>
                          
                          <h2>5. Start using BeanGPT</h2>
                          <p>Once saved, BeanGPT will automatically use your key.</p>
                          <p><strong>You're ready to start asking questions!</strong> 🌱</p>
                          
                          <div class="footer">
                            <p>© 2025 BeanGPT. All rights reserved.</p>
                            <p>Return to <a href="javascript:window.close()">BeanGPT</a></p>
                          </div>
                        </div>
                      </body>
                      </html>
                    `);
                    newTab.document.close();
                  }}
                  className="flex items-center px-3 py-2 text-sm gborder rounded-xl text-cyan-600 dark:text-cyan-300 hover:text-cyan-700 dark:hover:text-cyan-200 transition-colors"
                  title="API Key Instructions"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">API Setup</span>
                </button>
                <div className="flex-1">
                  <ApiKeyInput 
                    darkMode={darkMode} 
                    onApiKeyChange={handleApiKeyChange}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className={`${isMobile ? 'p-3' : 'px-5 py-4'} space-y-3`}>
            <div className={`${isMobile ? 'max-w-full' : 'max-w-5xl'} mx-auto space-y-3`}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`${isMobile ? 'max-w-[95%]' : 'max-w-[85%]'} ${msg.sender === 'user' ? 'order-2' : 'order-1'}`}>
                  {/* Message Header */}
                  <div className={`flex items-center space-x-2 mb-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.sender === 'user' ? (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                           style={{ boxShadow: '0 0 24px -6px rgba(168,85,247,.5)' }}>
                        R
                      </div>
                    ) : (
                      <div className="relative w-8 h-8 rounded-full p-[2px] avatar-ring">
                        <div className={`${darkMode ? 'avatar-inner-dark' : 'avatar-inner-light'} w-full h-full rounded-full flex items-center justify-center text-[10px] font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>AI</div>
                      </div>
                    )}
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      {msg.sender === 'user' ? 'Researcher' : 'BeanGPT AI'}
                    </span>
                    {msg.timestamp && (
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className={`${isMobile ? 'p-3' : 'p-4'} rounded-2xl transition-all ${isMobile ? 'text-sm' : 'text-sm'} ${
                    msg.sender === 'user'
                      ? `user-bubble ${darkMode ? 'text-slate-100' : 'text-gray-900'}`
                      : `gborder lift ${darkMode ? 'bg-slate-900/60 text-slate-100' : 'bg-white/80 text-gray-900'}`
                  }`}>
                    {msg.sender === 'assistant' ? (
                      <>
                        <ReactMarkdown 
                          className="prose dark:prose-invert max-w-none prose-blue prose-sm prose-compact" 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ node, ...props }) => (
                              <a 
                                {...props} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <span>{props.children}</span>
                                <FaExternalLinkAlt className="text-xs" />
                              </a>
                            ),

                            table: ({ node, ...props }) => (
                              <div className="overflow-x-auto">
                                <table {...props} className="min-w-full divide-y divide-gray-200 dark:divide-slate-700" />
                              </div>
                            ),
                            th: ({ node, ...props }) => (
                              <th {...props} className="px-4 py-3 bg-gray-50 dark:bg-slate-800 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider" />
                            ),
                            td: ({ node, ...props }) => (
                              <td {...props} className="px-4 py-3 text-sm text-gray-900 dark:text-slate-100" />
                            ),
                            p: ({ node, ...props }) => (
                              <p {...props} className="mb-3 leading-relaxed" />
                            ),
                            ul: ({ node, ...props }) => (
                              <ul {...props} className="mb-3 space-y-1" />
                            ),
                            ol: ({ node, ...props }) => (
                              <ol {...props} className="mb-3 space-y-1" />
                            ),
                            li: ({ node, ...props }) => (
                              <li {...props} className="leading-relaxed" />
                            ),
                            h1: ({ node, ...props }) => (
                              <h1 {...props} className="text-xl font-bold mb-3 mt-4 first:mt-0" />
                            ),
                            h2: ({ node, ...props }) => (
                              <h2 {...props} className="text-lg font-bold mb-3 mt-4 first:mt-0" />
                            ),
                            h3: ({ node, ...props }) => (
                              <h3 {...props} className="text-base font-bold mb-2 mt-3 first:mt-0" />
                            ),
                            strong: ({ node, ...props }) => (
                              <strong {...props} className="font-semibold" />
                            ),
                            em: ({ node, ...props }) => (
                              <em {...props} className="italic" />
                            )
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>

                        {/* Charts Section */}
                        {msg.chartData && Object.keys(msg.chartData).length > 0 && (
                          <div className="mt-6 space-y-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                              <span>📊</span>
                              <span>Interactive Charts</span>
                            </h3>
                            {/* Check if chartData is a single chart object or multiple charts */}
                            {msg.chartData.type ? (
                              // Single chart object (from yearly_average, trend analysis)
                              <PlotlyChart chartData={msg.chartData} darkMode={darkMode} />
                            ) : (
                              // Multiple charts object (from regular table display)
                              Object.entries(msg.chartData).map(([key, chartData]) => (
                                <div key={key} className="space-y-2">
                                  <PlotlyChart chartData={chartData} darkMode={darkMode} />
                                </div>
                              ))
                            )}
                          </div>
                        )}

                        {/* References Section */}
                        {msg.sources && msg.sources.length > 0 && hasInlineCitations(msg.text) && (
                          <div className={`mt-6 p-5 rounded-xl border-l-4 ${
                            darkMode 
                              ? 'bg-slate-800/30 border-l-blue-400 border border-slate-700' 
                              : 'bg-blue-50/50 border-l-blue-500 border border-blue-200'
                          }`}>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                              <span>📚</span>
                              <span>References</span>
                            </h3>
                            <div className="space-y-3">
                              {(() => {
                                // Separate web sources from DOI sources for proper numbering
                                const doiSources = [];
                                const webSources = [];
                                
                                msg.sources.forEach((source, index) => {
                                  if (source.startsWith('Web-')) {
                                    webSources.push({ source, originalIndex: index });
                                  } else {
                                    doiSources.push({ source, originalIndex: index });
                                  }
                                });
                                
                                return msg.sources.map((source, index) => {
                                  const isWebSource = source.startsWith('Web-');
                                  
                                  let citationLabel, sourceUrl, displayText;
                                  
                                  if (isWebSource) {
                                    // Extract citation label and URL from "Web-1: URL" format
                                    const match = source.match(/^(Web-\d+):\s*(.*)$/);
                                    if (match) {
                                      citationLabel = match[1];
                                      sourceUrl = match[2];
                                      displayText = sourceUrl;
                                    } else {
                                      // Fallback if format doesn't match
                                      citationLabel = `Web-${webSources.findIndex(ws => ws.originalIndex === index) + 1}`;
                                      sourceUrl = source;
                                      displayText = source;
                                    }
                                  } else {
                                    // Regular DOI source - number sequentially within DOI sources
                                    const doiIndex = doiSources.findIndex(ds => ds.originalIndex === index);
                                    citationLabel = `${doiIndex + 1}`;
                                    const formattedSource = source.replace('_', '/', 1);
                                    sourceUrl = source.startsWith('http') ? source : `https://doi.org/${formattedSource}`;
                                    displayText = source;
                                  }
                                  
                                  return (
                                    <div key={index} className="flex items-start space-x-3">
                                      <span className="font-bold text-blue-600 dark:text-blue-400 text-sm mt-0.5">
                                        [{citationLabel}]
                                      </span>
                                      <a 
                                        href={sourceUrl}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex-1 inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:underline text-sm group"
                                      >
                                        <span className="break-all">{displayText}</span>
                                        <FaExternalLinkAlt className="text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                      </a>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Gene Information Panel */}
                        {msg.genes && msg.genes.length > 0 && (
                          <div className={`mt-5 p-4 rounded-xl gborder lift ${darkMode ? 'bg-slate-900/40' : 'bg-white/70'}`}>
                            <button 
                              className="w-full flex items-center justify-between text-left"
                              onClick={() => setShowGenePanel(prevState => ({ ...prevState, [idx]: !prevState[idx] }))}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                                  <FaDna className="text-white text-sm" />
                                </div>
                                <div>
                                  <h3 className="text-base font-semibold text-emerald-800 dark:text-emerald-200">
                                    🧬 Genetic Elements Identified
                                  </h3>
                                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                    {msg.genes.length} gene{msg.genes.length !== 1 ? 's' : ''} and molecular markers found
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="px-2 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full">
                                  {msg.genes.length}
                                </span>
                                {showGenePanel[idx] ? <FaChevronUp className="text-emerald-600 dark:text-emerald-400" /> : <FaChevronDown className="text-emerald-600 dark:text-emerald-400" />}
                              </div>
                            </button>
                            
                            {showGenePanel[idx] && (
                              <div className={`mt-4 p-4 rounded-xl border-2 ${darkMode ? 'bg-gradient-to-br from-emerald-950/30 to-teal-950/30 border-emerald-600/30 backdrop-blur-sm' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200/80 backdrop-blur-sm'}`}>
                            
                            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                              {msg.genes.map((gene, geneIdx) => (
                                <div 
                                  key={geneIdx}
                                  className={`group relative p-5 rounded-xl border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                                    darkMode 
                                      ? 'bg-slate-900/70 border-slate-600/50 hover:bg-slate-800/80 hover:border-emerald-500/30' 
                                      : 'bg-white/90 border-emerald-200/60 hover:bg-white hover:border-emerald-300/80'
                                  }`}
                                >
                                  {/* Gene Header */}
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600"></div>
                                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                          Gene Target
                                        </span>
                                      </div>
                                      <code className="inline-block px-3 py-1.5 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 text-emerald-800 dark:text-emerald-200 rounded-lg font-mono text-sm font-bold border border-emerald-200/50 dark:border-emerald-700/50">
                                        {gene.name}
                                      </code>
                                    </div>
                                    <button 
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                                      title="Copy gene name to clipboard"
                                      onClick={() => {
                                        navigator.clipboard.writeText(gene.name);
                                        // Could add a toast notification here
                                      }}
                                    >
                                      <FaClipboard className="text-sm" />
                                    </button>
                                  </div>
                                  
                                  {/* Gene Details */}
                                  <div className="space-y-2">
                                    {gene.summary.includes('![') ? (
                                      // Handle preview images
                                      <div className="relative">
                                        <a 
                                          href={gene.link} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="block hover:opacity-90 transition-opacity"
                                        >
                                          <div className="relative overflow-hidden rounded-lg border-2 border-emerald-200 dark:border-emerald-700 hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors">
                                            <ReactMarkdown 
                                              className="prose dark:prose-invert max-w-none prose-sm prose-compact" 
                                              remarkPlugins={[remarkGfm]}
                                              components={{
                                                img: ({ node, ...props }) => (
                                                  <img 
                                                    {...props} 
                                                    className="w-full h-48 object-cover cursor-pointer"
                                                    style={{ margin: 0 }}
                                                    alt={`${gene.source} Preview for ${gene.name}`}
                                                  />
                                                )
                                              }}
                                            >
                                              {gene.summary}
                                            </ReactMarkdown>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                                            <div className="absolute bottom-2 left-2 right-2">
                                              <div className="flex items-center justify-between">
                                                <span className="text-xs text-white bg-black/60 px-2 py-1 rounded-full backdrop-blur-sm">
                                                  {gene.source} • {gene.description}
                                                </span>
                                                <FaExternalLinkAlt className="text-white text-xs" />
                                              </div>
                                            </div>
                                          </div>
                                        </a>
                                      </div>
                                    ) : gene.source === 'Literature Reference' && gene.summary.includes('•') ? (
                                      // Handle Literature Reference with bullet points using markdown
                                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                          <span className="text-blue-700 dark:text-blue-300 text-xs font-medium uppercase tracking-wider">Literature Reference</span>
                                        </div>
                                        <div className="prose dark:prose-invert max-w-none prose-sm">
                                          <ReactMarkdown 
                                            className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed"
                                            remarkPlugins={[remarkGfm]}
                                          >
                                            {gene.summary}
                                          </ReactMarkdown>
                                        </div>
                                      </div>
                                    ) : (
                                      // Handle text summaries (fallback)
                                      <div>
                                        {gene.source === 'GPT-4o' ? (
                                          // Special styling for GPT-4o generated descriptions
                                          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                                            <div className="flex items-center gap-2 mb-2">
                                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                              <span className="text-purple-700 dark:text-purple-300 text-xs font-medium uppercase tracking-wider">AI Generated</span>
                                            </div>
                                            <div className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                                              {gene.description}
                                            </div>
                                          </div>
                                        ) : (
                                          // Regular database summaries
                                          gene.summary.split('\n').filter(line => line.trim()).map((line, lineIdx) => (
                                      <div key={lineIdx} className="flex items-start space-x-3">
                                        {line.trim().startsWith('-') ? (
                                          <>
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0"></div>
                                            <span className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                                              {line.replace(/^-\s*/, '')}
                                            </span>
                                          </>
                                        ) : (
                                          <span className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                                            {line}
                                          </span>
                                        )}
                                      </div>
                                          ))
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Research Indicator */}
                                  <div className="mt-4 pt-3 border-t border-emerald-200/30 dark:border-emerald-700/30">
                                    <div className="flex items-center space-x-2 text-xs">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                        Research Target
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                                                             {/* Footer */}
                                 <div className="mt-6 pt-4 border-t border-emerald-200/50 dark:border-emerald-700/50">
                                   <div className="flex items-center justify-between text-xs">
                                     <span className="text-emerald-600 dark:text-emerald-400">
                                       💡 Genes extracted from research literature and databases
                                     </span>
                                     <span className="text-emerald-500 dark:text-emerald-500 font-mono">
                                      NCBI • UniProt
                                     </span>
                                   </div>
                                 </div>
                               </div>
                             )}
                           </div>
                        )}

                        {/* Research Toggle Section */}
                        {msg.showResearchToggle && (
                          <div className={`mt-6 p-5 rounded-xl border-2 border-dashed ${
                            darkMode 
                              ? 'bg-slate-800/50 border-blue-400 text-slate-200' 
                              : 'bg-blue-50 border-blue-400 text-gray-800'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className="text-lg font-semibold mb-2 flex items-center space-x-2">
                                  <span>📚</span>
                                  <span>Continue with Research Literature?</span>
                                </h4>
                                <p className="text-sm opacity-90 mb-4">
                                  Search scientific publications for additional genetic and biological insights related to your analysis.
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-3">
                              <button
                                onClick={() => handleContinueResearch(msg.originalQuestion || "Continue research", idx)}
                                disabled={isLoading || isStreaming || apiKeyStatus !== 'valid'}
                                className={`px-6 py-3 rounded-lg font-medium transition-all text-sm ${
                                  darkMode
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                                } disabled:cursor-not-allowed shadow-lg hover:shadow-xl`}
                              >
                                {isLoading || isStreaming ? (
                                  <span className="flex items-center space-x-2">
                                    <FaSpinner className="animate-spin" />
                                    <span>Searching...</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center space-x-2">
                                    <FaSearch />
                                    <span>Yes, Continue Research</span>
                                  </span>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setMessages(prev => prev.map((m, i) => 
                                    i === idx ? { ...m, showResearchToggle: false } : m
                                  ));
                                }}
                                disabled={isLoading || isStreaming || apiKeyStatus !== 'valid'}
                                className={`px-4 py-3 rounded-lg font-medium transition-all text-sm ${
                                  darkMode
                                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-50'
                                    : 'bg-gray-300 hover:bg-gray-400 text-gray-700 disabled:opacity-50'
                                } disabled:cursor-not-allowed`}
                              >
                                No, Stop Here
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Suggested Questions */}
                        {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                          <div className={`mt-6 p-4 rounded-xl ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-gray-50 border border-gray-200'}`}>
                            <button 
                              className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              onClick={() => setShowSuggestedQuestions(prevState => ({ ...prevState, [idx]: !prevState[idx] }))}
                            >
                              <span>💡 Suggested Follow-ups</span>
                              {showSuggestedQuestions[idx] ? <FaChevronUp /> : <FaChevronDown />}
                            </button>
                            {showSuggestedQuestions[idx] && (
                              <div className="mt-4 space-y-2">
                                {msg.suggestedQuestions.map((sq, sqIdx) => (
                                  <button 
                                    key={sqIdx}
                                    className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                                      darkMode 
                                        ? 'hover:bg-slate-700 text-slate-300 border border-slate-600' 
                                        : 'hover:bg-white text-gray-700 border border-gray-300'
                                    }`}
                                    onClick={() => setInput(sq)}
                                  >
                                    {sq}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm">{msg.text}</div>
                    )}

                    {/* Feedback Widget - Only for assistant messages that are not welcome messages */}
                    {msg.sender === 'assistant' && !msg.isWelcome && (
                      <FeedbackWidget
                        messageId={`msg_${idx}_${Date.now()}`}
                        question={messages[idx - 1]?.text || 'Unknown question'}
                        response={msg.text}
                        onFeedbackSubmit={handleFeedbackSubmit}
                        sessionId={currentSession}
                        className="mt-4"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Streaming Message - Research Continuation */}
            {isStreaming && streamingText && !isPostProcessing && (
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="relative w-8 h-8 rounded-full p-[2px] avatar-ring">
                      <div className={`${darkMode ? 'avatar-inner-dark' : 'avatar-inner-light'} w-full h-full rounded-full flex items-center justify-center text-[10px] font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>AI</div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-slate-400">BeanGPT AI</span>
                    <span className="text-xs text-blue-500 dark:text-blue-400">Adding Research Context...</span>
                  </div>
                  <div className={`p-5 rounded-2xl gborder text-sm ${
                    darkMode ? 'bg-slate-900/60 text-slate-100' : 'bg-white/80 text-gray-900'
                  }`}>
                    <ReactMarkdown 
                      className="prose dark:prose-invert max-w-none prose-blue prose-sm prose-compact" 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ node, ...props }) => (
                          <p {...props} className="mb-3 leading-relaxed" />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul {...props} className="mb-3 space-y-1" />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol {...props} className="mb-3 space-y-1" />
                        ),
                        li: ({ node, ...props }) => (
                          <li {...props} className="leading-relaxed" />
                        ),
                        h1: ({ node, ...props }) => (
                          <h1 {...props} className="text-xl font-bold mb-3 mt-4 first:mt-0" />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2 {...props} className="text-lg font-bold mb-3 mt-4 first:mt-0" />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 {...props} className="text-base font-bold mb-2 mt-3 first:mt-0" />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong {...props} className="font-semibold" />
                        ),
                        em: ({ node, ...props }) => (
                          <em {...props} className="italic" />
                        )
                      }}
                    >
                      {streamingText}
                    </ReactMarkdown>
                    <span className="inline-block w-2 h-5 bg-blue-500 animate-pulse ml-1"></span>
                  </div>
                </div>
              </div>
            )}

            {/* Post-Processing Message */}
            {isPostProcessing && (
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="relative w-8 h-8 rounded-full p-[2px] avatar-ring">
                      <div className={`${darkMode ? 'avatar-inner-dark' : 'avatar-inner-light'} w-full h-full rounded-full flex items-center justify-center text-[10px] font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>AI</div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-slate-400">BeanGPT AI</span>
                    <span className="text-xs text-blue-500 dark:text-blue-400">Processing...</span>
                  </div>
                  <div className={`p-5 rounded-2xl gborder text-sm ${
                    darkMode ? 'bg-slate-900/60 text-slate-100' : 'bg-white/80 text-gray-900'
                  }`}>
                    <ReactMarkdown 
                      className="prose dark:prose-invert max-w-none prose-blue prose-sm prose-compact" 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ node, ...props }) => (
                          <p {...props} className="mb-3 leading-relaxed" />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul {...props} className="mb-3 space-y-1" />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol {...props} className="mb-3 space-y-1" />
                        ),
                        li: ({ node, ...props }) => (
                          <li {...props} className="leading-relaxed" />
                        ),
                        h1: ({ node, ...props }) => (
                          <h1 {...props} className="text-xl font-bold mb-3 mt-4 first:mt-0" />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2 {...props} className="text-lg font-bold mb-3 mt-4 first:mt-0" />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 {...props} className="text-base font-bold mb-2 mt-3 first:mt-0" />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong {...props} className="font-semibold" />
                        ),
                        em: ({ node, ...props }) => (
                          <em {...props} className="italic" />
                        )
                      }}
                    >
                      {streamingText}
                    </ReactMarkdown>
                    
                    {/* Post-Processing Steps */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                      <div className="space-y-3">
                        {postProcessingSteps.map((step, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all duration-300 ${
                              index < postProcessingStep 
                                ? 'bg-green-500 text-white' 
                                : index === postProcessingStep 
                                  ? 'bg-blue-500 text-white animate-pulse' 
                                  : 'bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-400'
                            }`}>
                              {index < postProcessingStep ? '✓' : index === postProcessingStep ? '⋯' : (index + 1)}
                            </div>
                            <span className={`text-sm transition-all duration-300 ${
                              index <= postProcessingStep 
                                ? 'text-gray-900 dark:text-slate-100' 
                                : 'text-gray-500 dark:text-slate-500'
                            }`}>
                              {step.text}
                            </span>
                            {index === postProcessingStep && (
                              <div className="flex space-x-1">
                                <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                                <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading Message with Thinking Steps */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="relative w-8 h-8 rounded-full p-[2px] avatar-ring">
                      <div className={`${darkMode ? 'avatar-inner-dark' : 'avatar-inner-light'} w-full h-full rounded-full flex items-center justify-center text-[10px] font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>AI</div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-slate-400">BeanGPT AI</span>
                    <span className="text-xs text-blue-500 dark:text-blue-400">Thinking...</span>
                  </div>
                  <div className={`p-4 rounded-2xl gborder ${
                    darkMode ? 'bg-slate-900/60' : 'bg-white/80'
                  }`}>
                    <div className="space-y-3">
                      {/* Current step */}
                      <div className="flex items-center space-x-3">
                        <div className="text-lg">{(dynamicLoadingSteps[currentStep] || getLoadingSteps()[currentStep]).icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-900 dark:text-slate-100 font-medium">
                              {(dynamicLoadingSteps[currentStep] || getLoadingSteps()[currentStep]).step}
                            </span>
                            <FaSpinner className="animate-spin text-blue-500 text-xs" />
                          </div>
                          <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                            {(dynamicLoadingSteps[currentStep] || getLoadingSteps()[currentStep]).detail}
                          </div>
                        </div>
                      </div>

                      {/* Previous completed steps */}
                      {completedSteps.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-slate-700">
                          <div className="text-xs text-gray-500 dark:text-slate-500 mb-2">Previous steps:</div>
                          {completedSteps.slice(-3).map((stepIdx) => (
                            <div key={stepIdx} className="flex items-center space-x-3 opacity-60">
                              <div className="text-sm">{(dynamicLoadingSteps[stepIdx] || getLoadingSteps()[stepIdx]).icon}</div>
                              <div className="flex-1">
                                <div className="text-sm text-gray-700 dark:text-slate-300">
                                  {(dynamicLoadingSteps[stepIdx] || getLoadingSteps()[stepIdx]).step}
                                </div>
                              </div>
                              <div className="text-green-500 text-sm">✓</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className={`flex-shrink-0 ${isMobile ? 'p-3' : 'px-5 py-3'} glass-strong relative`}>
          <div className="sweep-line absolute top-0 left-0 right-0"></div>
          <div className={`${isMobile ? 'max-w-full' : 'max-w-4xl'} mx-auto`}>
            <form onSubmit={handleSend} className={`flex items-end ${isMobile ? 'space-x-2' : 'space-x-4'}`}>
              <div className="flex-1 gborder rounded-2xl">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={apiKeyStatus === 'valid'
                    ? (isMobile
                      ? "Ask about genes, cultivars, or data..."
                      : "Ask about gene functions, cultivar performance, or request data analysis...")
                    : (isMobile
                      ? "Enter API key above to start..."
                      : "Please enter your API key above to start asking questions...")}
                  disabled={isLoading || isStreaming || apiKeyStatus !== 'valid'}
                  rows={isMobile ? 2 : 1}
                  className={`w-full ${isMobile ? 'p-3 text-base' : 'p-4'} rounded-2xl bg-transparent resize-none transition-all focus:outline-none ${
                    darkMode
                      ? 'text-slate-100 placeholder-slate-500'
                      : 'text-gray-900 placeholder-gray-500'
                  } ${isLoading || isStreaming || apiKeyStatus !== 'valid' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ fontSize: isMobile ? '16px' : 'inherit' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || isStreaming || !input.trim() || apiKeyStatus !== 'valid'}
                className={`${isMobile ? 'p-3' : 'p-4'} rounded-2xl btn-send text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center`}
              >
                <FaPaperPlane className={isMobile ? 'text-base' : 'text-lg'} />
              </button>
            </form>
            {!isMobile && (
            <div className="flex items-center justify-center mt-4 text-xs text-gray-500 dark:text-slate-400 space-x-2">
              <span>BeanGPT can make mistakes, verify important info</span>
              <span>•</span>
              <span>© 2025 BeanGPT. All rights reserved.</span>
            </div>
            )}
            {isMobile && (
            <div className="flex flex-col items-center justify-center mt-3 text-xs text-gray-500 dark:text-slate-400 space-y-1 text-center">
              <span>BeanGPT can make mistakes, verify important info</span>
              <span>© 2025 BeanGPT. All rights reserved.</span>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Resources Modal */}
      {showResourcesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl ${isMobile ? 'w-full h-full max-w-none' : 'max-w-6xl w-full max-h-[90vh]'} overflow-y-auto`}>
            {/* Modal Header */}
            <div className={`sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 ${isMobile ? 'p-4' : 'p-6'} rounded-t-xl`}>
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>
                    🧬 {isMobile ? 'Research Resources' : 'Dry Bean Research Resources'}
                  </h2>
                  <p className={`text-gray-600 dark:text-slate-400 mt-2 ${isMobile ? 'text-sm' : ''}`}>
                    {isMobile 
                      ? 'Genomics & breeding tools for Phaseolus vulgaris'
                      : 'Comprehensive collection of genomics, breeding, and research tools for Phaseolus vulgaris'
                    }
                  </p>
                </div>
                <button
                  onClick={() => setShowResourcesModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                >
                  <FaTimes className="text-gray-500 dark:text-slate-400" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className={`${isMobile ? 'p-4' : 'p-6'} space-y-6`}>
              
              {/* Phaseolus Genomics & Breeding Resources */}
              <div className="space-y-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <h3 className="text-xl font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  🧬 Phaseolus Genomics & Breeding Resources
                </h3>
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
                  <ResourceCard
                    title="Phytozome (JGI)"
                    description="Genome portal hosting Phaseolus vulgaris reference genomes (e.g., G19833), annotations, and gene families"
                    link="https://phytozome-next.jgi.doe.gov"
                  />
                  <ResourceCard
                    title="LegumeInfo (USDA)"
                    description="Comprehensive portal for Phaseolus, Glycine, and other legumes: gene data, maps, synteny, traits"
                    link="https://legumeinfo.org"
                  />


                </div>
              </div>

              {/* Trait & QTL Databases */}
              <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  🔬 Trait & QTL Databases
                </h3>
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
                  <ResourceCard
                    title="SoyBase/LegumeBase QTL Viewer"
                    description="Although built for soybean, contains transferable tools and synteny-based QTL maps for Phaseolus"
                    link="https://www.soybase.org/"
                  />

                </div>
              </div>

              {/* Gene Function & Expression */}
              <div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <h3 className="text-xl font-semibold text-purple-800 dark:text-purple-200 flex items-center gap-2">
                  📚 Gene Function & Expression
                </h3>
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
                  <ResourceCard
                    title="Ensembl Plants"
                    description="Search Phaseolus vulgaris gene IDs, protein domains, orthologs, and variants"
                    link="https://plants.ensembl.org/Phaseolus_vulgaris"
                  />
                  <ResourceCard
                    title="NCBI Gene & GEO"
                    description="Gene function summaries, expression profiles, and related literature"
                    link="https://www.ncbi.nlm.nih.gov/gene"
                  />
                  <ResourceCard
                    title="ePlant for Legumes"
                    description="Interactive visualization tools for gene expression, co-expression, and protein–protein interaction networks"
                    link="https://bar.utoronto.ca/eplant_legumes"
                  />
                </div>
              </div>

              {/* Breeding & Germplasm Resources */}
              <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="text-xl font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                  🌱 Breeding & Germplasm Resources
                </h3>
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
                  <ResourceCard
                    title="CIAT Genetic Resources Unit"
                    description="Global Phaseolus germplasm bank and breeding materials"
                    link="https://ciat.cgiar.org/what-we-do/genetic-resources"
                  />
                  <ResourceCard
                    title="USDA GRIN Global"
                    description="Germplasm search tool for P. vulgaris and other species"
                    link="https://npgsweb.ars-grin.gov"
                  />
                  <ResourceCard
                    title="International Treaty on Plant Genetic Resources (Genesys)"
                    description="Global portal for passport data and genebank accessions"
                    link="https://www.genesys-pgr.org"
                  />
                </div>
              </div>

              {/* Literature & Research Discovery */}
              <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <h3 className="text-xl font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  🧠 Literature & Research Discovery
                </h3>
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
                  <ResourceCard
                    title="PubMed"
                    description="Search dry bean molecular biology and breeding papers"
                    link="https://pubmed.ncbi.nlm.nih.gov"
                  />
                  <ResourceCard
                    title="Google Scholar – Phaseolus vulgaris"
                    description="Curated papers tagged with Phaseolus vulgaris"
                    link="https://scholar.google.com/scholar?q=Phaseolus+vulgaris"
                  />
                  <ResourceCard
                    title="CABI Abstracts"
                    description="Global agriculture and plant science literature database"
                    link="https://www.cabi.org"
                  />
                </div>
              </div>

              {/* Tools for Computational Researchers */}
              <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  💻 Tools for Computational Researchers
                </h3>
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
                  <ResourceCard
                    title="Galaxy for Plant Science"
                    description="Web-based platform for accessible, reproducible, and collaborative research"
                    link="https://usegalaxy.org"
                  />
                  <ResourceCard
                    title="CoGe Genome Visualization"
                    description="Comparative genomics platform for visualization and analysis"
                    link="https://genomevolution.org/coge"
                  />
                  <ResourceCard
                    title="BLAST at NCBI"
                    description="Basic Local Alignment Search Tool for sequence analysis"
                    link="https://blast.ncbi.nlm.nih.gov/Blast.cgi"
                  />
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 dark:bg-slate-700 p-4 rounded-b-xl border-t border-gray-200 dark:border-slate-600">
              <div className="text-center text-sm text-gray-600 dark:text-slate-400">
                <p>Need more resources? Contact our research team or suggest additions to improve this collection.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gene Search Modal */}
      {showGeneSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden`}>
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'} flex items-center justify-between`}>
              <div className="flex items-center space-x-3">
                <FaSearch className="text-blue-500 text-xl" />
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Gene Search & Analysis
                </h2>
              </div>
              <button
                onClick={() => setShowGeneSearchModal(false)}
                className={`p-2 rounded-lg hover:${darkMode ? 'bg-slate-800' : 'bg-gray-100'} transition-colors`}
              >
                <FaTimes className={`${darkMode ? 'text-slate-400' : 'text-gray-600'}`} />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <GeneSearch apiKey={userApiKey} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ResourceCard Component
const ResourceCard = ({ title, description, link }) => {
  const handleClick = () => {
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      onClick={handleClick}
      className="p-4 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group active:scale-95 touch-manipulation"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1 leading-relaxed">
            {description}
          </p>
        </div>
        <FaExternalLinkAlt className="text-gray-400 group-hover:text-blue-500 mt-1 ml-2 flex-shrink-0" />
      </div>
    </div>
  );
};
 
 