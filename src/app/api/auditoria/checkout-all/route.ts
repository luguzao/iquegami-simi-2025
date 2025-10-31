import createServerSupabase from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabase()

    // Get all employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id')

    if (empError) {
      console.error('checkout-all: error fetching employees', empError)
      return new Response(
        JSON.stringify({ error: empError.message || String(empError) }),
        { status: 500 }
      )
    }

    if (!employees || employees.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhum colaborador encontrado' }),
        { status: 404 }
      )
    }

    // Perform checkout for all employees
    const checkoutData = employees.map((emp) => ({
      employee_id: emp.id,
      type: 'checkout',
      created_at: new Date().toISOString(),
    }))

    const { error: checkoutError } = await supabase
      .from('attendance_logs')
      .insert(checkoutData)

    if (checkoutError) {
      console.error('checkout-all: error inserting checkouts', checkoutError)
      return new Response(
        JSON.stringify({
          error: 'Erro ao realizar checkout',
          details: checkoutError.message,
        }),
        { status: 500 }
      )
    }

    const successCount = employees.length

    return new Response(
      JSON.stringify({
        message: `Check-out realizado para ${successCount} colaborador(es)`,
        count: successCount,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('checkout-all unexpected error', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
