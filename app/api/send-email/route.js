import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const requestData = await request.json();
    const { subscriptionId } = requestData;
    
    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, message: 'Missing subscription ID' },
        { status: 400 }
      );
    }
    
    // Create Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get subscription data with project info
    const { data: subscription, error: subscriptionError } = await supabase
      .from('email_subscriptions')
      .select(`
        id, 
        name, 
        email, 
        image_url, 
        project_id,
        projects (
          name,
          email_from,
          email_subject,
          email_body,
          email_smtp_host,
          email_smtp_port,
          email_smtp_secure,
          email_smtp_user,
          email_smtp_password
        )
      `)
      .eq('id', subscriptionId)
      .single();
      
    if (subscriptionError || !subscription) {
      console.error('Subscription fetch error:', subscriptionError);
      return NextResponse.json(
        { success: false, message: 'Subscription not found' },
        { status: 404 }
      );
    }
    
    const project = subscription.projects;
    
    // Check if we have the required project email settings
    if (!project || !project.email_smtp_host || !project.email_smtp_user) {
      return NextResponse.json(
        { success: false, message: 'Email settings not properly configured' },
        { status: 400 }
      );
    }
    
    // Set up nodemailer transport using project-specific SMTP settings
    const transporter = nodemailer.createTransport({
      host: project.email_smtp_host,
      port: parseInt(project.email_smtp_port || '587', 10),
      secure: project.email_smtp_secure === 'true',
      auth: {
        user: project.email_smtp_user,
        pass: project.email_smtp_password
      }
    });
    
    // Prepare email content
    const emailContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .photo-container { text-align: center; margin: 30px 0; }
            .photo { max-width: 100%; height: auto; border-radius: 8px; }
            .button { display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; }
            .footer { margin-top: 30px; font-size: 0.9em; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Bonjour ${subscription.name},</h2>
            </div>
            
            <p>${project.email_body.replace(/\n/g, '<br>')}</p>
            
            <div class="photo-container">
              <a href="${subscription.image_url}" class="button">Voir votre photo</a>
              <div style="margin-top: 20px;">
                <img src="${subscription.image_url}" alt="Votre photo" class="photo" />
              </div>
            </div>
            
            <div class="footer">
              <p>-- ${project.name}</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    // Send email
    await transporter.sendMail({
      from: project.email_from,
      to: subscription.email,
      subject: project.email_subject,
      html: emailContent
    });
    
    // Update subscription status
    await supabase
      .from('email_subscriptions')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', subscriptionId);
    
    return NextResponse.json({
      success: true,
      message: 'Email sent successfully'
    });
    
  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send email: ' + error.message },
      { status: 500 }
    );
  }
}
