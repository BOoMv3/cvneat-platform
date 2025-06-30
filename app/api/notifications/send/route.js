import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Configuration du transporteur email (utilise Gmail SMTP pour les tests)
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'cvneat@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Templates d'emails
const emailTemplates = {
  orderConfirmation: (orderData) => ({
    subject: `Confirmation de commande #${orderData.id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">CVN'Eat - Confirmation de commande</h2>
        <p>Bonjour ${orderData.customerName},</p>
        <p>Votre commande a été confirmée et est en cours de préparation.</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Détails de la commande #${orderData.id}</h3>
          <p><strong>Restaurant:</strong> ${orderData.restaurantName}</p>
          <p><strong>Total:</strong> ${orderData.total}€</p>
          <p><strong>Adresse de livraison:</strong> ${orderData.deliveryAddress}</p>
          <p><strong>Statut:</strong> ${orderData.status}</p>
        </div>
        
        <p>Vous recevrez une notification dès que votre commande sera prête.</p>
        <p>Merci de votre confiance !</p>
      </div>
    `
  }),
  
  orderStatusUpdate: (orderData) => ({
    subject: `Mise à jour commande #${orderData.id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">CVN'Eat - Mise à jour commande</h2>
        <p>Bonjour ${orderData.customerName},</p>
        <p>Le statut de votre commande a été mis à jour.</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Commande #${orderData.id}</h3>
          <p><strong>Nouveau statut:</strong> ${orderData.status}</p>
          <p><strong>Restaurant:</strong> ${orderData.restaurantName}</p>
        </div>
        
        <p>Merci de votre patience !</p>
      </div>
    `
  }),
  
  newPartnerRequest: (partnerData) => ({
    subject: 'Nouvelle demande de partenariat',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">CVN'Eat - Nouvelle demande de partenariat</h2>
        <p>Une nouvelle demande de partenariat a été soumise.</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Détails du restaurant</h3>
          <p><strong>Nom:</strong> ${partnerData.nom_restaurant}</p>
          <p><strong>Contact:</strong> ${partnerData.nom_contact}</p>
          <p><strong>Email:</strong> ${partnerData.email}</p>
          <p><strong>Téléphone:</strong> ${partnerData.telephone}</p>
          <p><strong>Adresse:</strong> ${partnerData.adresse}</p>
        </div>
        
        <p>Veuillez traiter cette demande dans l'interface d'administration.</p>
      </div>
    `
  }),
  
  partnerApproved: (partnerData) => ({
    subject: 'Demande de partenariat approuvée',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">CVN'Eat - Partenariat approuvé</h2>
        <p>Bonjour ${partnerData.nom_contact},</p>
        <p>Félicitations ! Votre demande de partenariat a été approuvée.</p>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Prochaines étapes</h3>
          <p>1. Connectez-vous à votre espace partenaire</p>
          <p>2. Complétez les informations de votre restaurant</p>
          <p>3. Ajoutez votre menu</p>
          <p>4. Configurez vos horaires d'ouverture</p>
        </div>
        
        <p>Bienvenue dans la famille CVN'Eat !</p>
      </div>
    `
  })
};

export async function POST(request) {
  try {
    const { type, data, recipientEmail } = await request.json();
    
    if (!type || !data || !recipientEmail) {
      return NextResponse.json(
        { error: 'Type, données et email destinataire requis' },
        { status: 400 }
      );
    }
    
    const template = emailTemplates[type];
    if (!template) {
      return NextResponse.json(
        { error: 'Type d\'email non reconnu' },
        { status: 400 }
      );
    }
    
    const emailContent = template(data);
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'cvneat@gmail.com',
      to: recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html
    };
    
    await transporter.sendMail(mailOptions);
    
    return NextResponse.json({
      success: true,
      message: 'Email envoyé avec succès'
    });
    
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de l\'email' },
      { status: 500 }
    );
  }
} 