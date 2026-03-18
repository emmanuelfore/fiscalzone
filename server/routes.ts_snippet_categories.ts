
// Product Categories
app.get("/api/product-categories", requireAuth, async (req, res) => {
    try {
        const companyId = req.query.companyId ? Number(req.query.companyId) : (req as any).user?.companyId;
        const categories = await storage.getProductCategories(companyId);
        res.json(categories);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

app.post("/api/product-categories", requireAuth, async (req, res) => {
    try {
        const data = insertProductCategorySchema.parse(req.body);
        const category = await storage.createProductCategory({
            ...data,
            companyId: (req as any).user?.companyId || data.companyId
        });
        res.status(201).json(category);
    } catch (err: any) {
        if (err.code === "23505") {
            return res.status(409).json({ message: "Category already exists" });
        }
        res.status(400).json({ message: err.message });
    }
});

app.delete("/api/product-categories/:id", requireAuth, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const companyId = (req as any).user?.companyId;
        await storage.deleteProductCategory(id, companyId);
        res.sendStatus(204);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});
