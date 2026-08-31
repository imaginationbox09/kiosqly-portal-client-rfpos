import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
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

    if (!consumerKey || !consumerSecret) {
      console.error('Faltan las credenciales de WooCommerce en el cuerpo:', body);
      return NextResponse.json({ error: 'Faltan las credenciales de WooCommerce' }, { status: 400 });
    }

    if (!userId) {
      console.error('Falta el user_id en el callback:', body);
      return NextResponse.json({ error: 'Falta el user_id' }, { status: 400 });
    }

    // Verificar si la empresa ya existe para este usuario
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let dbError = null;

    if (existing) {
      // Actualizar registro existente
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
      // Crear nuevo registro si no existía
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
      console.error('Error al guardar en Supabase:', dbError.message);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Respuesta exitosa obligatoria para WooCommerce
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('Error crítico en el callback:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return NextResponse.json({ status: 'Callback endpoint active' }, { status: 200 });
}
