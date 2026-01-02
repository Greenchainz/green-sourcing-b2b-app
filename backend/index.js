// Mount Azure-powered routes
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/ai', documentAIRoutes);
app.use('/api/v1/auth', authSyncRoutes);