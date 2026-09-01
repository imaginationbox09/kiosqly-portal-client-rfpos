import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Usamos Service Role Key para asegurar que tenga permisos de escritura en la base de datos
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> | { userId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const userId = resolvedParams.userId;

    let body: any = {};
    const contentType = request.headers.get('content-type') || '';

    // WooCommerce puede enviar los datos como JSON o como URL-encoded form data
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      const formData = new URLSearchParams(text);
      body = Object.fromEntries(formData.entries());
    } else {
      try {
        body = await request.json();
      } catch {
        const text = await request.text();
        const formData = new URLSearchParams(text);
        body = Object.fromEntries(formData.entries());
      }
    }

    const { consumer_key, consumer_secret } = body;

    if (!consumer_key || !consumer_secret) {
      return NextResponse.json(
        { success: false, error: 'No se recibieron las credenciales de WooCommerce (Consumer Key / Secret)' },
        { status: 400 }
      );
    }

    // Guardar o actualizar las credenciales en la tabla companies asociadas al user_id
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
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'WooCommerce conectado exitosamente' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}