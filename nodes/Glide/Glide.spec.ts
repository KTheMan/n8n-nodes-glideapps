import {Glide} from "./Glide.node";

test("smoke", () => {
    const node = new Glide()
    expect(node.description.properties).toBeDefined()
})
