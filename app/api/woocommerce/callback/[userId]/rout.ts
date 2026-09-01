import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const body = await request.json();

    const { consumer_key, consumer_secret } = body;

    if (!consumer_key || !consumer_secret) {
      return NextResponse.json(
        { success: false, error: 'No se recibieron las credenciales (Consumer Key / Secret)' },
        { status: 400 }
      );
    }

    // Guardar las credenciales en la tabla companies asociadas al user_id
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