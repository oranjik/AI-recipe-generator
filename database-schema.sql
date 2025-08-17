-- AI Recipe Chef Database Schema
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'active', 'cancelled', 'past_due', 'trialing')),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  stripe_customer_id TEXT UNIQUE,
  recipe_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Recipe usage tracking for rate limiting
CREATE TABLE public.recipe_usage (
  id SERIAL PRIMARY KEY,
  identifier TEXT NOT NULL, -- user_id or IP address for non-authenticated users
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identifier, date)
);

-- Saved recipes table
CREATE TABLE public.saved_recipes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  prep_time TEXT,
  cook_time TEXT,
  total_time TEXT,
  servings TEXT,
  difficulty TEXT,
  ingredients JSONB NOT NULL,
  instructions JSONB NOT NULL,
  tips JSONB,
  nutrition JSONB,
  cuisine TEXT,
  dietary_info JSONB,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipe collections/folders
CREATE TABLE public.recipe_collections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Many-to-many relationship between recipes and collections
CREATE TABLE public.recipe_collection_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  collection_id UUID REFERENCES public.recipe_collections(id) ON DELETE CASCADE NOT NULL,
  recipe_id UUID REFERENCES public.saved_recipes(id) ON DELETE CASCADE NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, recipe_id)
);

-- Shopping lists
CREATE TABLE public.shopping_lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Shopping List',
  items JSONB NOT NULL DEFAULT '[]',
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences
CREATE TABLE public.user_preferences (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  dietary_restrictions JSONB DEFAULT '[]',
  favorite_cuisines JSONB DEFAULT '[]',
  cooking_skill_level TEXT DEFAULT 'beginner' CHECK (cooking_skill_level IN ('beginner', 'intermediate', 'advanced')),
  preferred_cooking_time TEXT DEFAULT 'medium' CHECK (preferred_cooking_time IN ('quick', 'medium', 'long', 'extended')),
  kitchen_equipment JSONB DEFAULT '[]',
  allergens JSONB DEFAULT '[]',
  serving_size_preference INTEGER DEFAULT 2,
  measurement_system TEXT DEFAULT 'metric' CHECK (measurement_system IN ('metric', 'imperial')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API usage tracking for analytics
CREATE TABLE public.api_usage (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time INTEGER, -- in milliseconds
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription events for tracking
CREATE TABLE public.subscription_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- 'created', 'updated', 'cancelled', 'payment_succeeded', 'payment_failed'
  stripe_event_id TEXT,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for saved_recipes table
CREATE POLICY "Users can manage own recipes" ON public.saved_recipes
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for recipe_collections table
CREATE POLICY "Users can manage own collections" ON public.recipe_collections
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public collections are viewable" ON public.recipe_collections
  FOR SELECT USING (is_public = true);

-- RLS Policies for recipe_collection_items table
CREATE POLICY "Users can manage own collection items" ON public.recipe_collection_items
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.recipe_collections WHERE id = collection_id
    )
  );

-- RLS Policies for shopping_lists table
CREATE POLICY "Users can manage own shopping lists" ON public.shopping_lists
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for user_preferences table
CREATE POLICY "Users can manage own preferences" ON public.user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for recipe_usage table (admin access needed for rate limiting)
CREATE POLICY "Service role can manage recipe usage" ON public.recipe_usage
  FOR ALL USING (true);

-- RLS Policies for api_usage table (admin/analytics access)
CREATE POLICY "Service role can manage api usage" ON public.api_usage
  FOR ALL USING (true);

-- RLS Policies for subscription_events table
CREATE POLICY "Users can view own subscription events" ON public.subscription_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscription events" ON public.subscription_events
  FOR ALL USING (true);

-- Indexes for better performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_subscription_status ON public.users(subscription_status);
CREATE INDEX idx_users_stripe_customer_id ON public.users(stripe_customer_id);

CREATE INDEX idx_recipe_usage_identifier_date ON public.recipe_usage(identifier, date);
CREATE INDEX idx_recipe_usage_user_id ON public.recipe_usage(user_id);

CREATE INDEX idx_saved_recipes_user_id ON public.saved_recipes(user_id);
CREATE INDEX idx_saved_recipes_cuisine ON public.saved_recipes(cuisine);
CREATE INDEX idx_saved_recipes_is_favorite ON public.saved_recipes(is_favorite);
CREATE INDEX idx_saved_recipes_created_at ON public.saved_recipes(created_at);

CREATE INDEX idx_recipe_collections_user_id ON public.recipe_collections(user_id);
CREATE INDEX idx_recipe_collections_is_public ON public.recipe_collections(is_public);

CREATE INDEX idx_shopping_lists_user_id ON public.shopping_lists(user_id);

CREATE INDEX idx_api_usage_created_at ON public.api_usage(created_at);
CREATE INDEX idx_api_usage_endpoint ON public.api_usage(endpoint);

CREATE INDEX idx_subscription_events_user_id ON public.subscription_events(user_id);
CREATE INDEX idx_subscription_events_event_type ON public.subscription_events(event_type);

-- Functions and triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER handle_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_saved_recipes_updated_at
  BEFORE UPDATE ON public.saved_recipes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_recipe_collections_updated_at
  BEFORE UPDATE ON public.recipe_collections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_shopping_lists_updated_at
  BEFORE UPDATE ON public.shopping_lists
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update last_login_at
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET last_login_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Additional grants for specific operations
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_recipes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_collection_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_lists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;