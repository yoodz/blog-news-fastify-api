async function notify(message) {
    try {
        const res = await fetch(process.env.BARK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message)
        });
        
        return res;
    } catch (error) {
        console.error('推送失败:', error);
        throw error;
    }
}

module.exports = {
    notify
}
