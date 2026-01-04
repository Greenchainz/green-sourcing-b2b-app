export const TEST_USERS = {
    buyer: {
        email: 'test-buyer@example.com',
        password: 'password123',
        name: 'Test Buyer'
    },
    supplier: {
        email: 'test-supplier@example.com',
        password: 'password123',
        name: 'Test Supplier',
        company: 'Eco Materials Inc'
    },
    admin: {
        email: 'admin@greenchainz.com',
        password: 'adminpassword',
        name: 'Admin User'
    }
};

export const TEST_MATERIALS = [
    {
        id: 'mat-1',
        name: 'Recycled Steel Beams',
        category: 'Steel',
        price: 1200,
        carbonFootprint: 150
    },
    {
        id: 'mat-2',
        name: 'Low Carbon Concrete',
        category: 'Concrete',
        price: 800,
        carbonFootprint: 200
    }
];

export const TEST_RFQ = {
    title: 'Office Building Foundation',
    material: 'Concrete',
    quantity: '500 tons',
    location: 'New York, NY',
    budget: '50000'
};
