'use server';

import { z } from 'zod';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

import { createUser, getUser } from '@/lib/db/queries';

import { signIn } from './auth';

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Helper function to fetch allowed usernames from S3
async function fetchAllowedUsernamesFromS3(): Promise<string[]> {
  try {
    const bucketName = process.env.ALLOWED_USERS_S3_BUCKET_NAME;
    const fileName = 'cw-ai-chatbot-allowed-beta-users.txt';
    
    if (!bucketName) {
      console.warn('ALLOWED_USERS_S3_BUCKET_NAME not set, falling back to env var');
      return process.env.ALLOWED_USERNAMES?.split(',').map(u => u.trim()) || [];
    }
    
    // Use us-west-2 region as indicated by the error message
    const s3Client = new S3Client({ 
      region: 'us-west-2'
    });
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileName,
    });
    
    const response = await s3Client.send(command);
    
    if (!response.Body) {
      console.warn('S3 file body is empty, falling back to env var');
      return process.env.ALLOWED_USERNAMES?.split(',').map(u => u.trim()) || [];
    }
    
    // Convert the readable stream to a string
    const streamToString = (stream: any): Promise<string> => 
      new Promise((resolve, reject) => {
        const chunks: any[] = [];
        stream.on('data', (chunk: any) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      });
    
    const fileContent = await streamToString(response.Body);
    
    // Parse the content (assuming it's a comma-separated list)
    return fileContent.split(',').map(u => u.trim());
  } catch (error) {
    console.error('Error fetching allowed usernames from S3:', error);
    // Fallback to environment variable if S3 fetch fails
    return process.env.ALLOWED_USERNAMES?.split(',').map(u => u.trim()) || [];
  }
}

export interface LoginActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data';
}

export const login = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    return { status: 'failed' };
  }
};

export interface RegisterActionState {
  status:
    | 'idle'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'user_exists'
    | 'invalid_data'
    | 'invalid_domain';
}

export const register = async (
  _: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    // Check if the email is in the allowed list
    const email = validatedData.email.toLowerCase();
    if (!email.endsWith('@centralwcu.org')) {
      console.error('Registration rejected for invalid domain:', email);
      return { status: 'invalid_domain' };
    }
    
    // Get the username part of the email (before @)
    const username = email.split('@')[0];
    
    // Get the allowed usernames from S3 bucket
    const allowedUsernames = await fetchAllowedUsernamesFromS3();
    
    // Check if the username is in the allowed list
    if (allowedUsernames.length > 0 && !allowedUsernames.includes(username)) {
      console.error('Registration rejected for unauthorized email:', email);
      return { status: 'invalid_domain' };
    }

    const [user] = await getUser(email);

    if (user) {
      return { status: 'user_exists' } as RegisterActionState;
    }
    await createUser(email, validatedData.password);
    await signIn('credentials', {
      email: email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    return { status: 'failed' };
  }
};
