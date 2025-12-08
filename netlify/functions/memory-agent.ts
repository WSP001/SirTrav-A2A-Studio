/**
 * MEMORY AGENT - Continuous Learning System
 * 
 * PURPOSE: Store and retrieve learning data for 7 Agentic Systems
 * 
 * FEATURES:
 * - User preferences from 👍/👎 ratings
 * - Video generation history
 * - Agent performance metrics
 * - Workflow completion tracking
 * 
 * STORAGE: Netlify Blobs (FREE tier)
 * 
 * ENDPOINTS:
 * - POST /memory-agent?action=store    → Save learning data
 * - GET  /memory-agent?action=retrieve → Get learning data
 * - POST /memory-agent?action=learn    → Process weekly insights
 * - GET  /memory-agent?action=stats    → Get performance stats
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// Memory store types
interface UserPreferences {
  preferred_style: string;
  preferred_duration: string;
  preferred_music_genre: string;
  liked_videos: string[];
  disliked_videos: string[];
  feedback_history: FeedbackEntry[];
  updated_at: string;
}

interface FeedbackEntry {
  video_id: string;
  rating: 'good' | 'bad';
  timestamp: string;
  prompt_used: string;
  agents_used: string[];
}

interface VideoHistoryEntry {
  video_id: string;
  created_at: string;
  prompt: string;
  duration_seconds: number;
  resolution: string;
  agents_performance: AgentPerformance[];
  user_rating?: 'good' | 'bad';
  generation_time_ms: number;
}

interface AgentPerformance {
  agent_name: string;
  execution_time_ms: number;
  success: boolean;
  error?: string;
  output_quality_score?: number;
}

interface WorkflowMetrics {
  total_videos_generated: number;
  successful_completions: number;
  failed_completions: number;
  average_generation_time_ms: number;
  most_used_prompts: string[];
  best_performing_agents: string[];
  weekly_stats: WeeklyStats[];
}

interface WeeklyStats {
  week_start: string;
  videos_generated: number;
  success_rate: number;
  avg_user_rating: number;
  top_prompt_patterns: string[];
}

interface LearningInsights {
  recommended_defaults: {
    style: string;
    duration: string;
    music_genre: string;
  };
  agent_optimizations: {
    agent_name: string;
    suggestion: string;
  }[];
  prompt_improvements: string[];
  generated_at: string;
}

// In-memory cache (Netlify Blobs in production)
const memoryStore: {
  preferences: UserPreferences;
  history: VideoHistoryEntry[];
  metrics: WorkflowMetrics;
  insights: LearningInsights | null;
} = {
  preferences: {
    preferred_style: "cinematic",
    preferred_duration: "2-3 minutes",
    preferred_music_genre: "ambient",
    liked_videos: [],
    disliked_videos: [],
    feedback_history: [],
    updated_at: new Date().toISOString()
  },
  history: [],
  metrics: {
    total_videos_generated: 0,
    successful_completions: 0,
    failed_completions: 0,
    average_generation_time_ms: 0,
    most_used_prompts: [],
    best_performing_agents: [],
    weekly_stats: []
  },
  insights: null
};

// Helper: Get memory from Netlify Blobs
async function getMemory(key: string): Promise<any> {
  try {
    // In production, use Netlify Blobs
    // const { getStore } = await import("@netlify/blobs");
    // const store = getStore("sirtrav-memories");
    // return await store.get(key, { type: "json" });
    
    // For now, use in-memory store
    return (memoryStore as any)[key] || null;
  } catch (error) {
    console.error(`Error getting memory ${key}:`, error);
    return null;
  }
}

// Helper: Save memory to Netlify Blobs
async function saveMemory(key: string, data: any): Promise<boolean> {
  try {
    // In production, use Netlify Blobs
    // const { getStore } = await import("@netlify/blobs");
    // const store = getStore("sirtrav-memories");
    // await store.setJSON(key, data);
    
    // For now, use in-memory store
    (memoryStore as any)[key] = data;
    return true;
  } catch (error) {
    console.error(`Error saving memory ${key}:`, error);
    return false;
  }
}

// Action: Store feedback and learn from it
async function storeFeedback(body: any): Promise<any> {
  const { video_id, rating, prompt, agents } = body;
  
  const preferences = await getMemory('preferences') || memoryStore.preferences;
  
  // Add to feedback history
  const entry: FeedbackEntry = {
    video_id,
    rating,
    timestamp: new Date().toISOString(),
    prompt_used: prompt || '',
    agents_used: agents || []
  };
  
  preferences.feedback_history.push(entry);
  
  // Update liked/disliked lists
  if (rating === 'good') {
    preferences.liked_videos.push(video_id);
    // Learn from good videos - extract patterns
    await learnFromGoodVideo(prompt, agents);
  } else {
    preferences.disliked_videos.push(video_id);
  }
  
  preferences.updated_at = new Date().toISOString();
  await saveMemory('preferences', preferences);
  
  // Update metrics
  const metrics = await getMemory('metrics') || memoryStore.metrics;
  metrics.total_videos_generated++;
  if (rating === 'good') {
    metrics.successful_completions++;
  }
  await saveMemory('metrics', metrics);
  
  return {
    success: true,
    message: `Feedback stored for video ${video_id}`,
    total_feedback: preferences.feedback_history.length,
    learning_applied: rating === 'good'
  };
}

// Action: Learn patterns from successful videos
async function learnFromGoodVideo(prompt: string, agents: string[]): Promise<void> {
  const preferences = await getMemory('preferences') || memoryStore.preferences;
  
  // Extract style patterns from prompt
  const stylePatterns = ['cinematic', 'documentary', 'vlog', 'tutorial', 'story'];
  for (const style of stylePatterns) {
    if (prompt?.toLowerCase().includes(style)) {
      preferences.preferred_style = style;
      break;
    }
  }
  
  // Track best performing agents
  const metrics = await getMemory('metrics') || memoryStore.metrics;
  if (agents && agents.length > 0) {
    agents.forEach(agent => {
      if (!metrics.best_performing_agents.includes(agent)) {
        metrics.best_performing_agents.push(agent);
      }
    });
  }
  
  // Track successful prompts
  if (prompt && !metrics.most_used_prompts.includes(prompt)) {
    metrics.most_used_prompts.unshift(prompt);
    metrics.most_used_prompts = metrics.most_used_prompts.slice(0, 10); // Keep top 10
  }
  
  await saveMemory('preferences', preferences);
  await saveMemory('metrics', metrics);
}

// Action: Store video generation history
async function storeVideoHistory(body: any): Promise<any> {
  const history = await getMemory('history') || [];
  
  const entry: VideoHistoryEntry = {
    video_id: body.video_id || `vid_${Date.now()}`,
    created_at: new Date().toISOString(),
    prompt: body.prompt || '',
    duration_seconds: body.duration_seconds || 0,
    resolution: body.resolution || '1080p',
    agents_performance: body.agents_performance || [],
    generation_time_ms: body.generation_time_ms || 0
  };
  
  history.unshift(entry);
  
  // Keep last 100 videos
  const trimmedHistory = history.slice(0, 100);
  await saveMemory('history', trimmedHistory);
  
  // Update average generation time
  const metrics = await getMemory('metrics') || memoryStore.metrics;
  const totalTime = trimmedHistory.reduce((sum: number, v: VideoHistoryEntry) => sum + v.generation_time_ms, 0);
  metrics.average_generation_time_ms = Math.round(totalTime / trimmedHistory.length);
  await saveMemory('metrics', metrics);
  
  return {
    success: true,
    video_id: entry.video_id,
    history_count: trimmedHistory.length
  };
}

// Action: Retrieve learning data for agents
async function retrieveLearning(query: string): Promise<any> {
  const preferences = await getMemory('preferences') || memoryStore.preferences;
  const metrics = await getMemory('metrics') || memoryStore.metrics;
  const insights = await getMemory('insights');
  
  switch (query) {
    case 'preferences':
      return {
        preferred_style: preferences.preferred_style,
        preferred_duration: preferences.preferred_duration,
        preferred_music_genre: preferences.preferred_music_genre,
        total_likes: preferences.liked_videos.length,
        total_dislikes: preferences.disliked_videos.length
      };
    
    case 'prompts':
      return {
        most_successful_prompts: metrics.most_used_prompts.slice(0, 5),
        best_agents: metrics.best_performing_agents
      };
    
    case 'insights':
      return insights || {
        message: "No insights generated yet. Run weekly learning first."
      };
    
    case 'all':
    default:
      return {
        preferences: {
          style: preferences.preferred_style,
          duration: preferences.preferred_duration,
          music: preferences.preferred_music_genre
        },
        metrics: {
          total_videos: metrics.total_videos_generated,
          success_rate: metrics.total_videos_generated > 0 
            ? Math.round((metrics.successful_completions / metrics.total_videos_generated) * 100) 
            : 0,
          avg_generation_time: `${Math.round(metrics.average_generation_time_ms / 1000)}s`
        },
        top_prompts: metrics.most_used_prompts.slice(0, 3),
        best_agents: metrics.best_performing_agents.slice(0, 5)
      };
  }
}

// Action: Generate weekly learning insights
async function generateWeeklyInsights(): Promise<any> {
  const preferences = await getMemory('preferences') || memoryStore.preferences;
  const metrics = await getMemory('metrics') || memoryStore.metrics;
  const history = await getMemory('history') || [];
  
  // Analyze feedback patterns
  const recentFeedback = preferences.feedback_history.slice(-20);
  const goodCount = recentFeedback.filter(f => f.rating === 'good').length;
  const successRate = recentFeedback.length > 0 ? (goodCount / recentFeedback.length) * 100 : 0;
  
  // Generate insights
  const insights: LearningInsights = {
    recommended_defaults: {
      style: preferences.preferred_style,
      duration: preferences.preferred_duration,
      music_genre: preferences.preferred_music_genre
    },
    agent_optimizations: [],
    prompt_improvements: [],
    generated_at: new Date().toISOString()
  };
  
  // Analyze agent performance from history
  const agentStats: Record<string, { success: number; total: number; avgTime: number }> = {};
  
  history.forEach((video: VideoHistoryEntry) => {
    video.agents_performance?.forEach(perf => {
      if (!agentStats[perf.agent_name]) {
        agentStats[perf.agent_name] = { success: 0, total: 0, avgTime: 0 };
      }
      agentStats[perf.agent_name].total++;
      if (perf.success) agentStats[perf.agent_name].success++;
      agentStats[perf.agent_name].avgTime += perf.execution_time_ms;
    });
  });
  
  // Generate agent optimization suggestions
  Object.entries(agentStats).forEach(([agent, stats]) => {
    const rate = (stats.success / stats.total) * 100;
    if (rate < 80) {
      insights.agent_optimizations.push({
        agent_name: agent,
        suggestion: `${agent} has ${rate.toFixed(0)}% success rate. Consider reviewing error logs.`
      });
    }
  });
  
  // Generate prompt improvements
  if (successRate < 70) {
    insights.prompt_improvements.push("Consider using more specific prompts with style keywords");
  }
  if (metrics.most_used_prompts.length > 0) {
    insights.prompt_improvements.push(`Top performing prompt pattern: "${metrics.most_used_prompts[0].slice(0, 50)}..."`);
  }
  
  // Add weekly stats
  const weekStats: WeeklyStats = {
    week_start: new Date().toISOString().split('T')[0],
    videos_generated: history.filter((v: VideoHistoryEntry) => {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return new Date(v.created_at).getTime() > weekAgo;
    }).length,
    success_rate: successRate,
    avg_user_rating: goodCount / Math.max(recentFeedback.length, 1),
    top_prompt_patterns: metrics.most_used_prompts.slice(0, 3)
  };
  
  metrics.weekly_stats.unshift(weekStats);
  metrics.weekly_stats = metrics.weekly_stats.slice(0, 12); // Keep 12 weeks
  
  await saveMemory('insights', insights);
  await saveMemory('metrics', metrics);
  
  return {
    success: true,
    insights,
    weekly_stats: weekStats,
    message: "Weekly learning insights generated successfully"
  };
}

// Action: Get performance statistics
async function getStats(): Promise<any> {
  const metrics = await getMemory('metrics') || memoryStore.metrics;
  const preferences = await getMemory('preferences') || memoryStore.preferences;
  const history = await getMemory('history') || [];
  
  return {
    overview: {
      total_videos: metrics.total_videos_generated,
      successful: metrics.successful_completions,
      failed: metrics.failed_completions,
      success_rate: metrics.total_videos_generated > 0
        ? `${Math.round((metrics.successful_completions / metrics.total_videos_generated) * 100)}%`
        : 'N/A'
    },
    performance: {
      avg_generation_time: `${Math.round(metrics.average_generation_time_ms / 1000)}s`,
      best_agents: metrics.best_performing_agents.slice(0, 5),
      most_used_prompts: metrics.most_used_prompts.slice(0, 5)
    },
    learning: {
      total_feedback: preferences.feedback_history.length,
      likes: preferences.liked_videos.length,
      dislikes: preferences.disliked_videos.length,
      learned_style: preferences.preferred_style,
      learned_duration: preferences.preferred_duration
    },
    history: {
      recent_videos: history.slice(0, 5).map((v: VideoHistoryEntry) => ({
        id: v.video_id,
        created: v.created_at,
        rating: v.user_rating || 'unrated'
      }))
    },
    weekly_trends: metrics.weekly_stats.slice(0, 4)
  };
}

// Main handler
const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const action = params.action || 'stats';
    const query = params.query || 'all';
    
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch {
        body = {};
      }
    }

    let result;

    switch (action) {
      case 'store':
        // Store feedback: POST /memory-agent?action=store
        result = await storeFeedback(body);
        break;
      
      case 'history':
        // Store video history: POST /memory-agent?action=history
        result = await storeVideoHistory(body);
        break;
      
      case 'retrieve':
        // Retrieve learning: GET /memory-agent?action=retrieve&query=preferences|prompts|insights|all
        result = await retrieveLearning(query);
        break;
      
      case 'learn':
        // Generate weekly insights: POST /memory-agent?action=learn
        result = await generateWeeklyInsights();
        break;
      
      case 'stats':
      default:
        // Get stats: GET /memory-agent?action=stats
        result = await getStats();
        break;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        action,
        data: result,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Memory Agent error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    };
  }
};

export { handler };
