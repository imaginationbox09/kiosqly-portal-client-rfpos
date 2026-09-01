import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> | { userId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const userId = resolvedParams.userId;

    const contentType = request.headers.get('content-type') || '';
    let body: any = {};

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const text = await request.text();
      try {
        body = JSON.parse(text);
      } catch {
        const formData = new URLSearchParams(text);
        body = Object.fromEntries(formData.entries());
      }
    }

    const { consumer_key, consumer_secret } = body;

    if (!consumer_key || !consumer_secret) {
      return NextResponse.json(
        { success: false, error: 'Credenciales ausentes en el payload' },
        { status: 400 }
      );
    }

    // Actualizar credenciales en la base de datos de Supabase
    const { error } = await supabase
      .from('companies')
      .update({
        consumer_key: consumer_key,
        consumer_secret: consumer_secret,
        wc_connected: true,
        updated_at: new Date()
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error Supabase Callback WooCommerce:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'WooCommerce autorizado' }, { status: 200 });
  } catch (err: any) {
    console.error('Error Server Callback WooCommerce:', err);
    return NextResponse.json({ success: false, error: err.message || 'Error del servidor' }, { status: 500 });
  }
}