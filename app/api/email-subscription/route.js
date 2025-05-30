import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const requestData = await request.json();
    const { name, email, projectId, imageUrl } = requestData;
    
    // Validate required fields
    if (!name || !email || !projectId || !imageUrl) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Create Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Insert subscription into database
    const { data, error } = await supabase
      .from('email_subscriptions')
      .insert({
        name,
        email,
        project_id: projectId,
        image_url: imageUrl,
        status: 'pending'
      })
      .select();
      
    if (error) {
      console.error('Subscription error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to save subscription' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Subscription saved successfully',
      data: data[0]
    });
    
  } catch (error) {
    console.error('Email subscription error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
