
export default async function EnvPage() {
  return (
    <div>
      <pre>{JSON.stringify({
        URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'exists' : 'missing'
      }, null, 2)}</pre>
    </div>
  );
}
