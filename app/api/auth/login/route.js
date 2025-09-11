import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
const { isValidEmail } = require('@/lib/validation');
const { logSecurityEvent, SECURITY_EVENTS, RISK_LEVELS } = require('@/lib/securityMonitor');

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Validation des données
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    // Validation du format email
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { message: 'Format d\'email invalide' },
        { status: 400 }
      );
    }

    // Connexion à la base de données
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Recherche de l'utilisateur
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    await connection.end();

    if (users.length === 0) {
      // Log de tentative de connexion échouée
      logSecurityEvent(
        SECURITY_EVENTS.LOGIN_FAILED,
        { email, reason: 'User not found', userAgent: request.headers.get('user-agent') },
        RISK_LEVELS.MEDIUM,
        clientIP
      );
      
      return NextResponse.json(
        { message: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    const user = users[0];

    // Vérification du mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      // Log de tentative de connexion échouée
      logSecurityEvent(
        SECURITY_EVENTS.LOGIN_FAILED,
        { email, reason: 'Invalid password', userAgent: request.headers.get('user-agent') },
        RISK_LEVELS.MEDIUM,
        clientIP
      );
      
      return NextResponse.json(
        { message: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Création du token JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log de connexion réussie
    logSecurityEvent(
      SECURITY_EVENTS.LOGIN_SUCCESS,
      { email, userId: user.id, role: user.role, userAgent: request.headers.get('user-agent') },
      RISK_LEVELS.LOW,
      clientIP
    );

    // Retourne les informations de l'utilisateur et le token
    return NextResponse.json({
      message: 'Connexion réussie',
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return NextResponse.json(
      { message: 'Une erreur est survenue lors de la connexion' },
      { status: 500 }
    );
  }
} 