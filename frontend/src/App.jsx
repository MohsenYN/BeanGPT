import React, { useState, useRef, useEffect } from 'react';
import { 
  FaDna, FaFlask, FaMoon, FaSun, FaPaperPlane, FaSpinner, 
  FaChevronDown, FaChevronUp, FaHistory, FaBookmark, 
  FaSearch, FaChartBar, FaDatabase, FaFileAlt, FaMicroscope,
  FaCaretRight, FaExternalLinkAlt, FaClipboard
} from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import remarkGfm from 'remark-gfm';
import ChartComponent from './ChartComponent';

const initialMessages = [
  {
    sender: 'assistant',
    text: `## Welcome to **BeanGPT** - Powered by Beans

I'm your dedicated research assistant for **dry bean genetics and genomics**. I can help you with:

• **Gene Analysis** - Function, expression, and resistance mechanisms
• **Cultivar Performance** - Yield data, trials, and comparative analysis  
• **Research Literature** - PubMed papers and citations
• **Statistical Analysis** - Performance metrics and data insights

**Ready to start your research session?** Ask me about specific genes, cultivar performance, or browse recent studies.`,
    isWelcome: true
  }
];

export default function App() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [darkMode, setDarkMode] = useState(() =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentSession, setCurrentSession] = useState('Research Session 1');
  const chatEndRef = useRef(null);
  const [showSuggestedQuestions, setShowSuggestedQuestions] = useState({});
  const [showGenePanel, setShowGenePanel] = useState({});

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

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fix overscroll background color
  useEffect(() => {
    const backgroundColor = darkMode ? '#020617' : '#f9fafb';
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
      
      // Only use minimal timing for the first step, let backend progress drive the rest
      const timeout = setTimeout(() => {
        setCompletedSteps(prev => [...prev, 0]);
        setCurrentStep(1);
      }, 1000);
      timeouts.push(timeout);
    } else {
      // Reset when loading stops
      setCurrentStep(0);
      setCompletedSteps([]);
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

    setMessages((msgs) => [...msgs, userMsg]);
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
      setIsLoading(false);
      
      // Small delay to show initial analysis step
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      setIsStreaming(true);
      setStreamingText('');

      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMsgText,
          conversation_history: getConversationHistory()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'content') {
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
                  if (data.data.paper_count) {
                    setActualPaperCount(data.data.paper_count);
                  }
                  
                  // Update loading step based on backend progress
                  const currentSteps = getLoadingSteps();
                  
                  if (data.data.step === 'dataset') {
                    // Dataset query started
                    const datasetStepIndex = currentSteps.findIndex(step => step.step.includes('dataset') || step.step.includes('Checking'));
                    if (datasetStepIndex >= 0) setCurrentStep(datasetStepIndex);
                  } else if (data.data.step === 'processing') {
                    // Dataset processing
                    const processStepIndex = currentSteps.findIndex(step => step.step.includes('Processing') || step.step.includes('results'));
                    if (processStepIndex >= 0) setCurrentStep(processStepIndex);
                  } else if (data.data.step === 'dataset_success') {
                    // Dataset found data successfully
                    setQueryType('dataset');
                    const responseStepIndex = currentSteps.findIndex(step => step.step.includes('response') || step.step.includes('Generating'));
                    if (responseStepIndex >= 0) setCurrentStep(responseStepIndex);
                  } else if (data.data.step === 'fallback' || data.data.step === 'error_fallback') {
                    // Falling back to literature search
                    setQueryType('mixed');
                    const searchStepIndex = currentSteps.findIndex(step => step.step.includes('literature') || step.step.includes('Searching'));
                    if (searchStepIndex >= 0) setCurrentStep(searchStepIndex);
                  } else if (data.data.step === 'embeddings') {
                    // Processing embeddings
                    setCurrentStep(1); // Processing embeddings step
                  } else if (data.data.step === 'search') {
                    // Searching literature database
                    const searchStepIndex = currentSteps.findIndex(step => step.step.includes('literature') || step.step.includes('Searching'));
                    if (searchStepIndex >= 0) setCurrentStep(searchStepIndex);
                  } else if (data.data.step === 'papers') {
                    // Found papers
                    const paperStepIndex = currentSteps.findIndex(step => step.step.includes('papers') || step.step.includes('Retrieving'));
                    if (paperStepIndex >= 0) {
                      setCurrentStep(paperStepIndex);
                      // Update the step detail with actual count
                      currentSteps[paperStepIndex].detail = data.data.detail;
                    }
                  } else if (data.data.step === 'generation') {
                    // AI generation started
                    const genStepIndex = currentSteps.findIndex(step => step.step.includes('response') || step.step.includes('Generating'));
                    if (genStepIndex >= 0) setCurrentStep(genStepIndex);
                  } else if (data.data.step === 'genes') {
                    // Gene analysis
                    const geneStepIndex = currentSteps.findIndex(step => step.step.includes('genetic') || step.step.includes('Analyzing'));
                    if (geneStepIndex >= 0) setCurrentStep(geneStepIndex);
                  } else if (data.data.step === 'finalizing') {
                    // Final processing
                    const finalStepIndex = currentSteps.findIndex(step => step.step.includes('Finalizing') || step.step.includes('output'));
                    if (finalStepIndex >= 0) setCurrentStep(finalStepIndex);
                  }
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

                     // Append Full Markdown Table
                     if (data.data.full_markdown_table) {
                       assistantMarkdown += '\n\n---\n## 📊 **Complete Dataset**\n' + data.data.full_markdown_table;
                     }

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
                console.error('Error parsing streaming data:', e);
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
      setMessages((msgs) => [
        ...msgs,
        {
          sender: 'assistant',
          text: '❌ **Connection Error**\n\nUnable to reach the research database. Please check your connection and try again.',
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoadingMessage('');
    }
  };

  const quickActions = [
    { icon: FaSearch, label: "Gene Lookup", action: () => setInput("Tell me about resistance genes in dry beans") },
    { icon: FaFileAlt, label: "Literature", action: () => setInput("Find recent papers on dry bean genomics") }
  ];

  // Helper function to check if text contains inline citations
  const hasInlineCitations = (text) => {
    // Check for patterns like [1], [2], [3] etc.
    const citationPattern = /\[\d+\]/g;
    return citationPattern.test(text);
  };

  return (
    <div className={`h-screen w-screen flex ${darkMode ? 'bg-slate-950' : 'bg-gray-50'} transition-all duration-300 overflow-hidden`} style={{
      height: '100vh',
      background: darkMode ? '#020617' : '#f9fafb',
      overscrollBehavior: 'none'
    }}>
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} transition-all duration-300 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} border-r flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <FaDna className="text-white text-lg" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">BeanGPT</h1>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Powered by Beans</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <FaCaretRight className={`text-gray-500 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
            </button>
          </div>
        </div>

        {/* Session Info */}
        {!sidebarCollapsed && (
          <div className="p-4 border-b border-gray-200 dark:border-slate-800">
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
        {!sidebarCollapsed && (
          <div className="p-4 border-b border-gray-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Quick Research</h3>
            <div className="space-y-2">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.action}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-sm"
                >
                  <action.icon className="text-blue-500 text-sm" />
                  <span className="text-gray-700 dark:text-slate-300">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* About Us Section */}
        {!sidebarCollapsed && (
          <div className="p-4 flex-1">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">About</h3>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Research Platform</h4>
                <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed mb-3">
                  BeanGPT is an AI-powered research platform for dry bean genetics and genomics analysis, 
                  developed to support sustainable agriculture and breeding research.
                </p>
                
            <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-slate-300">Developed by:</p>
                    <p className="text-xs text-gray-600 dark:text-slate-400">Kiarash Mirkamandari</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-slate-300">Supervised by:</p>
                    <p className="text-xs text-gray-600 dark:text-slate-400">Dr. Mohsen Yoosefzadeh Najafabadi</p>
                    <p className="text-xs text-gray-500 dark:text-slate-500">Principal Investigator</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-slate-300">Research Paper:</p>
                    <p className="text-xs text-gray-600 dark:text-slate-400">
                      "AI-Driven Analysis Platform for Dry Bean Genetics and Performance Data"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Program Credit */}
        {!sidebarCollapsed && (
          <div className="px-4 py-2">
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
        <div className="p-4 border-t border-gray-200 dark:border-slate-800">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors`}
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
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className={`flex-shrink-0 p-6 border-b ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-white/80'} backdrop-blur-sm`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Main Platform</h2>
              <p className="text-gray-600 dark:text-slate-400 text-sm mt-1">
                Dry Bean Genetics & Genomics Analysis Platform
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-slate-400">
                <div className={`w-2 h-2 rounded-full ${
                  isLoading ? 'bg-yellow-400 animate-pulse' : 
                  isStreaming ? 'bg-green-400 animate-pulse' : 
                  isPostProcessing ? 'bg-blue-400 animate-pulse' : 
                  'bg-green-400'
                }`}></div>
                <span>{
                  isLoading ? 'Processing' : 
                  isStreaming ? 'Generating' : 
                  isPostProcessing ? 'Analyzing' : 
                  'Ready'
                }</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6 space-y-6">
            <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] ${msg.sender === 'user' ? 'order-2' : 'order-1'}`}>
                  {/* Message Header */}
                  <div className={`flex items-center space-x-2 mb-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      msg.sender === 'user' 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                    }`}>
                      {msg.sender === 'user' ? 'R' : 'AI'}
                    </div>
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
                  <div className={`p-5 rounded-2xl shadow-sm border transition-all hover:shadow-md text-sm ${
                    msg.sender === 'user'
                      ? `${darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-blue-50 border-blue-200 text-gray-900'}`
                      : `${darkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-900'}`
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
                              <ChartComponent chartData={msg.chartData} darkMode={darkMode} />
                            ) : (
                              // Multiple charts object (from regular table display)
                              Object.entries(msg.chartData).map(([key, chartData]) => (
                                <div key={key} className="space-y-2">
                                  <ChartComponent chartData={chartData} darkMode={darkMode} />
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
                              {msg.sources.map((source, index) => {
                                const formattedSource = source.replace('_', '/', 1);
                                const doiUrl = source.startsWith('http') ? source : `https://doi.org/${formattedSource}`;
                                return (
                                  <div key={index} className="flex items-start space-x-3">
                                    <span className="font-bold text-blue-600 dark:text-blue-400 text-sm mt-0.5">
                                      [{index + 1}]
                                    </span>
                                    <a 
                                      href={doiUrl}
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex-1 inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:underline text-sm group"
                                    >
                                      <span className="break-all">{source}</span>
                                      <FaExternalLinkAlt className="text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Gene Information Panel */}
                        {msg.genes && msg.genes.length > 0 && (
                          <div className={`mt-5 p-4 rounded-xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-emerald-50/50 border-emerald-200'}`}>
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
                                       NCBI • UniProt • PlantGDB
                                     </span>
                                   </div>
                                 </div>
                               </div>
                             )}
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
                  </div>
                </div>
              </div>
            ))}

            {/* Streaming Message */}
            {isStreaming && (
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-semibold text-white">
                      AI
                    </div>
                    <span className="text-xs text-gray-500 dark:text-slate-400">BeanGPT AI</span>
                    <span className="text-xs text-green-500 dark:text-green-400">Generating...</span>
                  </div>
                  <div className={`p-5 rounded-2xl shadow-sm border text-sm ${
                    darkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
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
                    <span className="inline-block w-2 h-5 bg-green-500 animate-pulse ml-1"></span>
                  </div>
                </div>
              </div>
            )}

            {/* Post-Processing Message */}
            {isPostProcessing && (
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-semibold text-white">
                      AI
                    </div>
                    <span className="text-xs text-gray-500 dark:text-slate-400">BeanGPT AI</span>
                    <span className="text-xs text-blue-500 dark:text-blue-400">Processing...</span>
                  </div>
                  <div className={`p-5 rounded-2xl shadow-sm border text-sm ${
                    darkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-semibold text-white">
                      AI
                    </div>
                    <span className="text-xs text-gray-500 dark:text-slate-400">BeanGPT AI</span>
                    <span className="text-xs text-blue-500 dark:text-blue-400">Thinking...</span>
                  </div>
                  <div className={`p-4 rounded-2xl shadow-sm border ${
                    darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
                  }`}>
                    <div className="space-y-3">
                      {/* Current step */}
                      <div className="flex items-center space-x-3">
                        <div className="text-lg">{getLoadingSteps()[currentStep].icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-900 dark:text-slate-100 font-medium">
                              {getLoadingSteps()[currentStep].step}
                            </span>
                            <FaSpinner className="animate-spin text-blue-500 text-xs" />
                          </div>
                          <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                            {getLoadingSteps()[currentStep].detail}
                          </div>
                        </div>
                      </div>

                      {/* Previous completed steps */}
                      {completedSteps.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-slate-700">
                          <div className="text-xs text-gray-500 dark:text-slate-500 mb-2">Previous steps:</div>
                          {completedSteps.slice(-3).map((stepIdx) => (
                            <div key={stepIdx} className="flex items-center space-x-3 opacity-60">
                              <div className="text-sm">{getLoadingSteps()[stepIdx].icon}</div>
                              <div className="flex-1">
                                <div className="text-sm text-gray-700 dark:text-slate-300">
                                  {getLoadingSteps()[stepIdx].step}
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
        <div className={`flex-shrink-0 p-6 border-t ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-white/80'} backdrop-blur-sm`}>
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSend} className="flex items-end space-x-4">
              <div className="flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about gene functions, cultivar performance, or request data analysis..."
                  disabled={isLoading || isStreaming}
                  rows={1}
                  className={`w-full p-4 rounded-xl border resize-none transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } ${isLoading || isStreaming ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                disabled={isLoading || isStreaming || !input.trim()}
                className="p-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                <FaPaperPlane className="text-lg" />
              </button>
            </form>
            <div className="flex items-center justify-center mt-4 text-xs text-gray-500 dark:text-slate-400">
              <span>Press Enter to send • Shift+Enter for new line</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
 