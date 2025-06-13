// 边缘函数：获取预设的Github账号的Token
export async function onRequest(context) {
    const { request, env } = context;
    const kv = env.GITHUB_TOKENS;
    let token = await kv.get("doll2021_github_token");
    
    return new Response(JSON.stringify({ token }), {
        headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store' // 确保不缓存敏感数据
        }
    });
}
