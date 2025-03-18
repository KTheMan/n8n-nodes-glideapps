import {Shippo} from "./Shippo.node";

test("smoke", () => {
    const node = new Shippo()
    expect(node.description.properties).toBeDefined()
})
