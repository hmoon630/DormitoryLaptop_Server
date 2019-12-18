module.exports = () => {
    return async function errorHandler(ctx, next) {
        try {
            await next();
        } catch (error){
            ctx.status = error.statusCode || 500;
            ctx.body = error.message;

            return;
        }
    }
}