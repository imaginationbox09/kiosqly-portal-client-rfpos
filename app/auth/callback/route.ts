import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    
    // Acepta tanto la variable clásica como la nueva llave secreta de Supabase (sb_secret_...)
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseKey) {
      console.error('ERROR CRÍTICO: No se encontró ninguna llave secreta de Supabase configurada en Vercel.');
      return NextResponse.json({ error: 'Falta configurar la llave secreta en el servidor' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    const contentType = request.headers.get('content-type') || '';
    let body: any = {};

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const text = await request.text();
      try {
        body = JSON.parse(text);
      } catch {
        const params = new URLSearchParams(text);
        body = Object.fromEntries(params.entries());
      }
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id') || body.user_id;
    const consumerKey = body.consumer_key;
    const consumerSecret = body.consumer_secret;

    console.log('Procesando callback de WooCommerce para user_id:', userId);

    if (!consumerKey || !consumerSecret || !userId) {
      console.error('Datos incompletos recibidos:', { userId, hasKey: !!consumerKey, hasSecret: !!consumerSecret });
      return NextResponse.json({ error: 'Faltan credenciales o user_id' }, { status: 400 });
    }

    // Verificar si la empresa ya existe
    const { data: existing, error: findError } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (findError) {
      console.error('Error al consultar Supabase:', findError.message);
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    let dbError = null;

    if (existing) {
      const { error } = await supabase
        .from('companies')
        .update({
          consumer_key: consumerKey,
          consumer_secret: consumerSecret,
          wc_connected: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      dbError = error;
    } else {
      const { error } = await supabase
        .from('companies')
        .insert({
          user_id: userId,
          consumer_key: consumerKey,
          consumer_secret: consumerSecret,
          wc_connected: true,
          company_name: 'Mi Empresa',
          updated_at: new Date().toISOString()
        });
      dbError = error;
    }

    if (dbError) {
      console.error('Error de Supabase al guardar llaves:', dbError.message);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    console.log('¡Credenciales de WooCommerce guardadas exitosamente!');
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('Excepción crítica en el callback:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Callback endpoint active' }, { status: 200 });
}
