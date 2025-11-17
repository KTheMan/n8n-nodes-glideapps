import {Glide} from "./Glide.node";

test("smoke", () => {
    const node = new Glide()
    expect(node.description.properties).toBeDefined()
})

test("should have all required row operations in npm API", () => {
    const node = new Glide();
    const properties = node.description.properties;
    
    // Find the operation property for npm API (not the OpenAPI one)
    const operationProp = properties.find((prop: any) => 
        prop.name === 'operation' && 
        prop.displayOptions?.show?.apiType?.[0] === 'npm'
    );
    expect(operationProp).toBeDefined();
    
    if (!operationProp || !operationProp.options) {
        throw new Error('Operation property or options not found');
    }
    
    // Check that all Zapier/Make parity operations exist
    const rowOps = operationProp.options.filter((opt: any) => opt.resource === 'row');
    const rowOpValues = rowOps.map((opt: any) => opt.value);
    
    expect(rowOpValues).toContain('rowCreate');  // Add Row
    expect(rowOpValues).toContain('rowUpdate');  // Update Row
    expect(rowOpValues).toContain('rowDelete');  // Delete Row
    expect(rowOpValues).toContain('rowGet');     // Get Row
    expect(rowOpValues).toContain('rowGetAll');  // Get All Rows
})

test("should have execute method", () => {
    const node = new Glide();
    expect(node.execute).toBeDefined();
    expect(typeof node.execute).toBe('function');
})

