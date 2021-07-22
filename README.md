# Unnamed layout engine

This package aims at providing a base for a layout engine regardless of what graphic framework will be used. It implements the following:

- a json based layout description system for creating entire structures from static json templates
- a render-loop single-pass flexbox positioning system with margin and padding support
- a runtime api for finding and manipulating instantiated layout elements

## Layout description syntax

### LayoutElementJson

Top-level structure used to describe the layout. This structure is passed to the layout factory to create element instances.

| filed | type | default | description |
|:---|:---:|:---:|:---|
| type | `string` | - | **(required)** element type |
| name | `string` | `undefined` | element name |
| children | `LayoutElementJson[]` | `undefined` | element's children |
| layout | `LayoutConfig` | `undefined` | element layout configuration, see table below for more details |
| config | `Object` | `undefined` | element configuration, specific to the element type |
| metadata | `Object` | `undefined `| addition user data to be attached to the element instance |

### LayoutConfig

The element's layout configuration.

| filed | type | default | description |
|:---|:---:|:---:|:---|
| enabled | `boolean` | `true` | should the element be rendered. Disabled elements are not updated, nor are their children |
| volatile | `boolean` | `false` | should changes in the element's layout trigger a forced update of it's children. This is value is forced to true when the element uses a flex mode. |
| ignoreLayout | `boolean `| `false` | When true this element will not affect it's parent's size and will be positioned relatively to it's parent position regardless to the parent's flex mode. When parent is not using a flex mode then this is a no-op. |
| flexMode | `"none"` `"horizontal"` `"vertical"` | `"none"` | Sets the element flex mode. The flex modes work similarly to css flexbox containers (with "horizontal" being `flex-direction: row` and "vertical" `flex-direction: column`). When a flex mode is enabled the element size and children positions are controlled by the chosen layout type. |
| flexHorizontalAlign | `"left"` `"right"` `"center"` | `"left"` | controls how children are aligned inside a flex layout |
| flexVerticalAlign | `"top"` `"bottom"` `"middle"` | `"top"` | controls how children are aligned inside a flex layout |
| flexGrow | `number` | 0 | basically `flex-grow`, meaningful only inside a flex layout |
| top, left | `number` `function` | 0 | outside a flex layout sets the element's position relative to it's parent, inside a flex layout will apply an offset **after** the parent's layout has been computed. A callback returning a number can be provided. The element instance will be passed to the callback as the first parameter. |
| width, height | `number` `string` `function` | `undefined` | see section below for detailed information on how width and height is calculated |
| padding | `PositioningBox` | `undefined` | padding inside the element, in most cases makes sense only inside a flex layout as it is ignored for relative positioning |
| margin | `PositioningBox` | `undefined` | margin outside the element, in contrast to padding it is not ignored for relative positioning, but still makes little sense outside a flex layout |

### Width and height values

- When a dimension is set to a number that value is used directly.
- When a dimension is a string it is expected to to match `/\d+%/` and is evaluated as a percentage of parent's size
- When a dimension is a function it should be a `(element: LayoutElement) => number | null` callback that returns the element's size. `null` should be returned only if the size could not be computed.
- When a dimension is `undefined` the element's content size is used.

Setting a dimension controlled by the current layout (so `width` for horizontal and `height` for vertical) will set the element's base dimension (using a css analogy, basically `flex-basis`).

### PositioningBox

An object or number used for providing padding and margin values.

| filed | type | default | description |
|:---|:---:|:---:|:---|
| top, left, bottom, right | `number` | 0 | values for each dimension |
| vertical | `number` | 0 | sets top and bottom at the same time |
| horizontal | `number` | 0 | sets left and right at the same time |

If an number is given instead of an object then all dimensions are set that the given value.

## Instancing elements

A LayoutFactory instance is used to create element instances.

```typescript
interface LayoutFactory {
    create(layout: LayoutElementJson, parent?: LayoutElement) => LayoutElement
}
```

If `parent` is provided the created element will be inserted as it's last child.

Alternatively elements can be created by passing `LayoutElementJson` to the `insertElement` / `replaceElement` functions of a LayoutElement instance.

## LayoutElement

The base class for all instantiated layout elements.

### Properties reference

| name | type | description |
|:---|:---:|:---|
| type | `string` | **(readonly)** the element type |
| name | `string` `undefined` | **(readonly)** the element name |
| children | `LayoutElement[]` | **(readonly)** element children array |
| metadata | `Object`| **(readonly)** user defined metadata |
| factory | `LayoutFactory`| **(readonly)** the factory instance that was used to create this element |
| hasParent| `boolean` | **(readonly)** true if the element has a parent |
| parent | `LayoutElement` | **(readonly)** element's parent, throws an exception if the parent does not exist |
| contentWidth | `number` | **(readonly)** element's content width. This is **not** equal to the computed element size, this value is used to get the element's natural size (like image dimensions for an image) |
| contentHeight | `number` | **(readonly)** see `contentWidth` above |
| enabled | `boolean` | should the element be rendered / updated |
| treeEnabled | `boolean` | **(readonly)** check if the element is actually active (it's entire parent chain is enabled)
| parentLayout | `"none"` `"horizontal"` `"vertical"` | **(readonly)** get the parent's flex mode |
| top | `number` | the top value as it was configured, if the value was a callback the callback result will be returned |
| left | `number` | see `top` above |
| innerTop | `number` | **(readonly)** computed element's top value |
| innerLeft | `number` | **(readonly)** computed element's left value |
| width | `number` | **(readonly)** computed element's width including padding |
| innerWidth | `number` | **(readonly)** computed element's width without padding |
| outerWidth | `number` | **(readonly)** computed element's width including margin |
| height | `number` | **(readonly)** computed element's height including padding |
| innerHeight | `number` | **(readonly)** computed element's height without padding |
| outerHeight | `number` | **(readonly)** computed element's height including margin |
| widthReady | `boolean` | **(readonly)** true if the elements width has been computed |
| heightReady | `boolean` | **(readonly)** true if the elements height has been computed |

### Function reference

| name | signature | description |
|:---|:---:|:---|
| forEach | `(callback: (e: LayoutElement) => void) => void` | call the provided callback for this element and all of it's children |
| update | `() => void` | update the element and all of it's children. **This function should be called on the layout's root element on each iteration of the application render loop.** |
| updateConfig | `(config: LayoutConfig) => void` | update the element's layout configuration. The provided object is merged with the current layout configuration. |
| getPath | `(root?: LayoutElement) => string \| undefined` | get path of the current element relative to the provided element (or current root if non provided). Undefined is returned if the object does not have a name. |
| isParentOf | `(child: LayoutElement) => boolean` | returns true if current element exists in the parent chain of the given child. |
| getElement | `(name: string, noThrow = false) => LayoutElement \| null` | resolves an element by name. See section below for details about name resolution. By default (noThrow = false) throws an exception when the element is not found. When noThrow is true returns null instead.
| hasElement | `(name: string) => boolean` | checks if the given name resolves to an element. See section below for detail about name resolution.
| insertElement | `(e: LayoutElement \| LayoutElementJson, before?: LayoutElement \| string) => LayoutElement` | insert a child to the current element, by default at the end. The insertion point can be changed by providing an element before which the new element should be inserted. Creates the element if LayoutElementJson is given instead of an element instance. |
| replaceElement | `(new: LayoutElement \| LayoutElementJson, old: LayoutElement \| string => LayoutElement` | replace a direct child of the current element with a different element. Creates the element if LayoutElementJson is given instead of an element instance. |
| delete | `() => void` | remove the current element from it's parent |
| deleteChildren | `(offset = 0) => void` | remove all children of the current element. If offset is provided deletion will start at the given offset and children before it will be preserved. |

### Resolving elements by name

The name resolution system allows to find elements by name. Each element that was defined with a name will be stored inside a name table of the first named parent in it's parent chain. 

Element which names start with `@` will not be stored in a name table but will still create a name table themselves.

Names passed to `getElement` / `hasElement` can be dot delimited paths. For example calling `e.getElement("foo.bar")` will query `e` for `foo` and then the result for `bar`.

Consider the example below:

```
   root
(1)  foo
(2)  /unnamed/
(3)    bar
(4)      rab
(5)  @off
(6)    foo
```

Now consider the following function calls:

```typescript
root.getElement("foo")     // 1
root.getElement("bar")     // 3
root.getElement("bar.rab") // 4
root.getElement("@off")    // error, @off not stored in a name table
root.children[1]           // 2
root.children[2]           // 5
root.children[2].getElement("foo") // 6
root.children[1].getElement("bar") // error, unnamed element does not have a name table
```

## Implementing element types

1. extend LayoutElement
2. register the resulting class by calling register on a LayoutFactory instance
3. fudge around with typescript's types
3. profit

(I think this section would use some improvements)
