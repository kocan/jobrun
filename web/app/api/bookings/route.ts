import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface BookingEntry {
  id: string;
  operator_id: string;
  business_name: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  service_type: string;
  preferred_date: string;
  preferred_time: string;
  notes: string;
  status: 'pending';
  created_at: string;
}

async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component
          }
        },
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { operatorId, businessName, customerName, customerPhone, customerEmail, serviceType, preferredDate, preferredTime, notes } = body;

    if (!operatorId || typeof operatorId !== 'string') {
      return NextResponse.json({ error: 'Invalid operator.' }, { status: 400 });
    }
    if (!customerName || typeof customerName !== 'string' || customerName.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }
    if (!customerPhone || typeof customerPhone !== 'string' || customerPhone.trim().length === 0) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }
    if (!customerEmail || typeof customerEmail !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }
    const trimmedEmail = customerEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }
    if (!serviceType || typeof serviceType !== 'string') {
      return NextResponse.json({ error: 'Please select a service.' }, { status: 400 });
    }
    if (!preferredDate || typeof preferredDate !== 'string') {
      return NextResponse.json({ error: 'Preferred date is required.' }, { status: 400 });
    }

    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        operator_id: operatorId.trim(),
        business_name: typeof businessName === 'string' ? businessName.trim() : '',
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: trimmedEmail,
        service_type: serviceType.trim(),
        preferred_date: preferredDate.trim(),
        preferred_time: typeof preferredTime === 'string' ? preferredTime.trim() : '',
        notes: typeof notes === 'string' ? notes.trim() : '',
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create booking:', error);
      return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Booking request submitted!', id: data.id });
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
