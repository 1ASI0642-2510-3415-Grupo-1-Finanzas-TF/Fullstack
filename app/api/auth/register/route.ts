import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../lib/generated/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import {signToken} from "@/lib/auth";

const prisma = new PrismaClient();

const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['EMISOR', 'INVERSIONISTA']).optional()
});

export async function POST(request: NextRequest) {
    try {
        const { email, password, role } = RegisterSchema.parse(await request.json());

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                role: role || 'EMISOR'
            }
        });

        const token = await signToken({ userId: user.id });
        const response = NextResponse.json({ success: true, token, user: { id: user.id, email: user.email, role: user.role } }, { status: 201 });
        const secureCookie = process.env.SECURE_COOKIES === 'true';
        response.cookies.set({
            name: 'token',
            value: token,
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24,
            secure: secureCookie
        });

        return response;
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            console.error('Zod validation error:', error.errors);
            return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
        }
        console.error('register error', error);
        return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
    }
}