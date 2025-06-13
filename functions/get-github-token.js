// functions/get-github-token.js
export async function onRequestGet(context) {
    try {
        // 从环境变量中获取 KV
        const token = await context.env.GITHUB_TOKENS.get('doll2021_github_token');
        
        if (!token) {
            return new Response(JSON.stringify({ 
                error: 'Token not found in KV' 
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        return new Response(JSON.stringify({ token }), {
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store' // 确保不缓存敏感数据
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ 
            error: 'Internal server error',
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
