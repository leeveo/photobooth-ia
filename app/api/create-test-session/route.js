export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Simuler une session admin pour test
    const testSessionData = {
      userId: "test-user-id",
      email: "jumpwiththedevil.evhtribute@gmail.com",
      company_name: "Test Company",
      logged_in: true,
      login_method: 'manual_test',
      login_time: new Date().toISOString(),
      google_id: "test-google-id"
    };
    
    // Encoder en base64
    const encodedSession = Buffer.from(JSON.stringify(testSessionData)).toString('base64');
    
    return Response.json({
      success: true,
      message: "Session de test créée",
      session_data: testSessionData,
      encoded_session: encodedSession,
      instructions: "Utilisez cette session encodée dans localStorage avec la clé 'admin_session'"
    });

  } catch (error) {
    return Response.json({ 
      error: 'Erreur création session test', 
      details: error.message 
    }, { status: 500 });
  }
}