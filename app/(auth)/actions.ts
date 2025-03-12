'use server';

import { z } from 'zod';

import { createUser, getUser } from '@/lib/db/queries';

import { signIn } from './auth';

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

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
    
    // Get the allowed usernames from environment variable
    const allowedUsernames = process.env.ALLOWED_USERNAMES?.split(',').map(u => u.trim()) || [];
    
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
