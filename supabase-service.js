/**
 * Supabase Service Module
 * Handles all database operations for the Quiz System
 */

class SupabaseService {
  constructor() {
    this.db = null;
  }

  async initialize() {
    await window.SupabaseConfig.initSupabase();
    this.db = window.SupabaseConfig.getSupabaseClient();
    return this.db;
  }

  // ========================================================================
  // AUTH OPERATIONS
  // ========================================================================

  async signUp(email, password, fullName) {
    try {
      const { data, error } = await this.db.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });

      if (error) throw error;

      // Create user profile
      await this.createUserProfile(data.user.id, email, fullName);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    }
  }

  async signIn(email, password) {
    try {
      const { data, error } = await this.db.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  async signOut() {
    try {
      const { error } = await this.db.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.db.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async onAuthStateChange(callback) {
    return this.db.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }

  // ========================================================================
  // USER PROFILE OPERATIONS
  // ========================================================================

  async createUserProfile(userId, email, fullName) {
    try {
      const { data, error } = await this.db
        .from('users')
        .insert([
          {
            id: userId,
            email,
            full_name: fullName
          }
        ]);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Create profile error:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserProfile(userId) {
    try {
      const { data, error } = await this.db
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get profile error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateUserProfile(userId, updates) {
    try {
      const { data, error } = await this.db
        .from('users')
        .update({ ...updates, updated_at: new Date() })
        .eq('id', userId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================================================
  // QUIZ OPERATIONS
  // ========================================================================

  async getAllQuizzes() {
    try {
      const { data, error } = await this.db
        .from('quizzes')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get quizzes error:', error);
      return { success: false, error: error.message };
    }
  }

  async getQuizById(quizId) {
    try {
      const { data, error } = await this.db
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get quiz error:', error);
      return { success: false, error: error.message };
    }
  }

  async createQuiz(quizData, createdBy) {
    try {
      const { data, error } = await this.db
        .from('quizzes')
        .insert([{ ...quizData, created_by: createdBy }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Create quiz error:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================================================
  // QUESTION OPERATIONS
  // ========================================================================

  async getQuizQuestions(quizId) {
    try {
      const { data, error } = await this.db
        .from('questions')
        .select('*, options(*)')
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get questions error:', error);
      return { success: false, error: error.message };
    }
  }

  async addQuestion(quizId, questionText, orderIndex) {
    try {
      const { data, error } = await this.db
        .from('questions')
        .insert([
          {
            quiz_id: quizId,
            question_text: questionText,
            order_index: orderIndex
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Add question error:', error);
      return { success: false, error: error.message };
    }
  }

  async addOption(questionId, optionText, isCorrect, orderIndex) {
    try {
      const { data, error } = await this.db
        .from('options')
        .insert([
          {
            question_id: questionId,
            option_text: optionText,
            is_correct: isCorrect,
            order_index: orderIndex
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Add option error:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================================================
  // QUIZ ATTEMPT OPERATIONS
  // ========================================================================

  async startQuizAttempt(userId, quizId) {
    try {
      const { data, error } = await this.db
        .from('quiz_attempts')
        .insert([
          {
            user_id: userId,
            quiz_id: quizId
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Start attempt error:', error);
      return { success: false, error: error.message };
    }
  }

  async submitAnswer(attemptId, questionId, selectedOptionId) {
    try {
      // Get correct answer
      const { data: correctOption, error: optionError } = await this.db
        .from('options')
        .select('is_correct')
        .eq('id', selectedOptionId)
        .single();

      if (optionError) throw optionError;

      const { data, error } = await this.db
        .from('user_answers')
        .insert([
          {
            quiz_attempt_id: attemptId,
            question_id: questionId,
            selected_option_id: selectedOptionId,
            is_correct: correctOption.is_correct
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Submit answer error:', error);
      return { success: false, error: error.message };
    }
  }

  async completeQuizAttempt(attemptId, score, timeTaken) {
    try {
      const { data, error } = await this.db
        .from('quiz_attempts')
        .update({
          score,
          time_taken_seconds: timeTaken,
          completed_at: new Date(),
          passed: score >= 70
        })
        .eq('id', attemptId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Complete attempt error:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserAttempts(userId) {
    try {
      const { data, error } = await this.db
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get attempts error:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================================================
  // LEADERBOARD OPERATIONS
  // ========================================================================

  async getLeaderboard(limit = 50) {
    try {
      const { data, error } = await this.db
        .from('leaderboard')
        .select('*, users(*)')
        .order('total_points', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get leaderboard error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateLeaderboard(userId) {
    try {
      // Get user's total score from attempts
      const { data: attempts, error: attemptsError } = await this.db
        .from('quiz_attempts')
        .select('score')
        .eq('user_id', userId)
        .not('score', 'is', null);

      if (attemptsError) throw attemptsError;

      if (attempts.length === 0) return { success: true };

      const totalPoints = attempts.reduce((sum, a) => sum + a.score, 0);
      const averageScore = (totalPoints / attempts.length).toFixed(2);

      const { data, error } = await this.db
        .from('leaderboard')
        .upsert(
          [
            {
              user_id: userId,
              total_points: totalPoints,
              quizzes_taken: attempts.length,
              average_score: averageScore,
              last_updated: new Date()
            }
          ],
          { onConflict: 'user_id' }
        );

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Update leaderboard error:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ========================================================================

  subscribeToQuizAttempts(userId, callback) {
    return this.db
      .channel(`quiz_attempts_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_attempts',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  }

  subscribeToLeaderboard(callback) {
    return this.db
      .channel('leaderboard_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaderboard'
        },
        callback
      )
      .subscribe();
  }
}

// Create global instance
window.supabaseService = new SupabaseService();