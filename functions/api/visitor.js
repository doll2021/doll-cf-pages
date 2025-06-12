// 边缘函数：记录访问次数
export async function onRequest(context) {
    const { request, env } = context;
    // 使用KV存储
    const kv = env.COUNTER;
    let count = await kv.get("visits") || 0;
    count = parseInt(count) + 1;
    await kv.put("visits", count.toString());
    
    return new Response(JSON.stringify({ count }), {
        headers: { 'Content-Type': 'application/json' }
    });
}
