import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { serial_number, battery_level, wifi_signal, charging_status, app_version } = body;

    if (!serial_number) {
      return NextResponse.json({ error: 'El número de serie de la tablet es obligatorio' }, { status: 400 });
    }

    // Actualizamos el estado de salud de la tablet Lenovo en Supabase
    const { data, error } = await supabase
      .from('kiosks')
      .update({
        last_seen: new Date().toISOString(),
        battery_level: battery_level !== undefined ? battery_level : 100,
        wifi_signal: wifi_signal || 'Buena',
        charging_status: charging_status || 'Conectado',
        app_version: app_version || 'v2.1.0',
        status: 'En línea'
      })
      .eq('serial_number', serial_number)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Heartbeat de tablet Lenovo registrado con éxito', data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
