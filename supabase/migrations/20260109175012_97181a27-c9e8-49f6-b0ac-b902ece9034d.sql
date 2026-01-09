-- Add DELETE policy for profiles table (LGPD/GDPR compliance)
CREATE POLICY "Users can delete their own profile" 
ON profiles 
FOR DELETE 
USING (auth.uid() = id);