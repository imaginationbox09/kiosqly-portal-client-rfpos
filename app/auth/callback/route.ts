import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Usamos Service Role Key si está disponible para evitar bloqueos de RLS, o la anon key por defecto
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let body: any = {};

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const text = await request.text();
      const params = new URLSearchParams(text);
      body = Object.fromEntries(params.entries());
    }

    // WooCommerce puede enviar user_id por la URL o dentro del cuerpo de la petición
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id') || body.user_id;
    const consumerKey = body.consumer_key;
    const consumerSecret = body.consumer_secret;

    if (!consumerKey || !consumerSecret) {
      return NextResponse.json({ error: 'Faltan las credenciales de WooCommerce' }, { status: 400 });
    }

    if (userId) {
      // Guardar credenciales de forma segura en Supabase
      const { error } = await supabase
        .from('companies')
        .update({
          consumer_key: consumerKey,
          consumer_secret: consumerSecret,
          wc_connected: true,
          updated_at: new Date()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error al actualizar Supabase:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Responder con éxito a WooCommerce para que complete la redirección
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('Error en el callback de WooCommerce:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}

// Ruta GET de respaldo por si WooCommerce realiza una verificación previa
export async function GET(request: Request) {
  return NextResponse.json({ status: 'Callback endpoint active' }, { status: 200 });
}
