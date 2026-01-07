import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export function useConversationMemory() {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load the most recent conversation on mount
  const loadLastConversation = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Get the most recent non-archived conversation using raw query approach
      const { data: conversations, error: convError } = await (supabase as any)
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (convError) throw convError;

      if (conversations && conversations.length > 0) {
        const conv = conversations[0];
        setConversation({
          id: conv.id,
          title: conv.title,
          created_at: conv.created_at,
          updated_at: conv.updated_at
        });

        // Load messages for this conversation
        const { data: msgs, error: msgsError } = await (supabase as any)
          .from('ai_messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true });

        if (msgsError) throw msgsError;

        setMessages((msgs || []).map((m: any) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
          metadata: m.metadata,
          created_at: m.created_at
        })));
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Create a new conversation
  const createNewConversation = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('ai_conversations')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned');

      const newConv = {
        id: data.id,
        title: data.title,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
      
      setConversation(newConv);
      setMessages([]);
      
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }, [user]);

  // Save a message to the current conversation
  const saveMessage = useCallback(async (
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<void> => {
    if (!user) return;

    let conversationId = conversation?.id;

    // Create a new conversation if none exists
    if (!conversationId) {
      conversationId = await createNewConversation();
      if (!conversationId) return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('ai_messages')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          role,
          content,
          metadata: metadata || {}
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned');

      // Update local state
      setMessages(prev => [...prev, {
        id: data.id,
        role: data.role as 'user' | 'assistant',
        content: data.content,
        metadata: data.metadata,
        created_at: data.created_at
      }]);

      // Update conversation's updated_at
      await (supabase as any)
        .from('ai_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    } catch (error) {
      console.error('Error saving message:', error);
    }
  }, [user, conversation?.id, createNewConversation]);

  // Archive current conversation and start fresh
  const archiveConversation = useCallback(async (): Promise<void> => {
    if (!user || !conversation?.id) return;

    try {
      await (supabase as any)
        .from('ai_conversations')
        .update({ is_archived: true })
        .eq('id', conversation.id);

      setConversation(null);
      setMessages([]);
    } catch (error) {
      console.error('Error archiving conversation:', error);
    }
  }, [user, conversation?.id]);

  // Get recent conversations for history
  const getRecentConversations = useCallback(async (limit: number = 10): Promise<Conversation[]> => {
    if (!user) return [];

    try {
      const { data, error } = await (supabase as any)
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        created_at: c.created_at,
        updated_at: c.updated_at
      }));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }, [user]);

  // Get conversation history for AI context (last N messages)
  const getConversationHistory = useCallback(async (limit: number = 20): Promise<{ role: string; content: string }[]> => {
    if (!conversation?.id) return [];

    try {
      const { data, error } = await (supabase as any)
        .from('ai_messages')
        .select('role, content')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Reverse to get chronological order
      return (data || []).reverse();
    } catch (error) {
      console.error('Error fetching history:', error);
      return [];
    }
  }, [conversation?.id]);

  // Load conversation on mount
  useEffect(() => {
    if (user) {
      loadLastConversation();
    }
  }, [user, loadLastConversation]);

  return {
    conversation,
    messages,
    isLoading,
    saveMessage,
    createNewConversation,
    archiveConversation,
    getRecentConversations,
    getConversationHistory,
    loadLastConversation
  };
}
