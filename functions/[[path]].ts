export const onRequest: PagesFunction = async (context) => {
  const { request, next } = context;
  const url = new URL(request.url);

  // Allow the request to proceed to look for static assets
  const response = await next();

  // If the resource is not found (404) and it's not a file (doesn't have a dot in the path)
  // we redirect to the root index.html to let React Router handle it.
  if (response.status === 404 && !url.pathname.includes('.')) {
    return context.env.ASSETS.fetch(new URL('/', request.url));
  }

  return response;
};
