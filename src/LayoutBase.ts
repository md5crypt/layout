/**
 * {@link LayoutElement} configuration structure that is used to create new elements.
 */
export interface LayoutElementConfig<CONFIG extends LayoutElementConfig = any, SELF extends LayoutElement = any> {
	/** type element type to create */
	type: string

	/**
	 * The element name, used to resolve elements, see {@link LayoutElement.getElement}.
	 *
	 * * elements are resolved via paths constructed from their and their parents names
	 * * unnamed elements are not resolvable, but their children are (via the first named parent in the tree).
	 * * names that start from `@` inform that the element and all of it's children should be not resolvable.
	 * * {@link noChildrenMap} can be used to force the element to be resolvable but have it's children resolve via parent like was to be unnamed.
	 */
	name?: string

	/**
	 * element x position, if set to function the function will be called each update to compute the left value
	 * @defaultValue 0
	 */
	left?: number | ((element: SELF) => number)

	/**
	 * element y position, if set to function the function will be called each update to compute the top value
	 * @defaultValue 0
	 */
	top?: number | ((element: SELF) => number)

	/**
	 * element width, if set to function the function will be called each update to compute the width value
	 *
	 * when not set {@link LayoutElement.hasWidth} will read as `false` and
	 * the actual width will be determined by {@link LayoutElement.contentWidth}
	 *
	 * @defaultValue undefined
	 */
	width?: number | ((element: SELF) => number | null)

	/**
	 * element height, if set to function the function will be called each update to compute the height value
	 *
	 * when not set {@link LayoutElement.hasHeight} will read as `false` and
	 * the actual width will be determined by {@link LayoutElement.contentHeight}
	 *
	 * @defaultValue undefined
	 */
	height?: number | ((element: SELF) => number | null)

	/**
	 * offset added to final x position value (after taking into account {@link origin}
	 * @defaultValue 0
	 */
	marginLeft?: number

	/**
	 * offset added to final y position value (after taking into account {@link origin}
	 * @defaultValue 0
	 */
	marginTop?: number

	/**
	 * offset added to final width value (after taking into account {@link fill}
	 * @defaultValue 0
	 */
	paddingWidth?: number

	/**
	 * offset added to final height value (after taking into account {@link fill}
	 * @defaultValue 0
	 */
	paddingHeight?: number

	/**
	 * element scale
	 * @defaultValue 1
	 */
	scale?: number

	/**
	 * element anchor point (point on the element from which it's position is calculated) with values relative to the elements's size
	 * * array with [x, y] values or single number that get expanded to [x, x]
	 * * [0, 0] is top left corner
	 * * [0.5, 0.5] is center
	 * * [1, 1] is bottom right
	 * * any other values are also valid
	 * @defaultValue [0, 0]
	 */
	anchor?: [number, number] | number

	/**
	 * element origin point (point on the parent element from which this element position is calculated) with values relative to the parent elements's size
	 * * array with [xOrigin, yOrigin] values or single number that get expanded to [x, x]
	 * * [0, 0] is top left corner
	 * * [0.5, 0.5] is center
	 * * [1, 1] is bottom right
	 * * any other values are also valid
	 * @defaultValue [0, 0]
	 */
	origin?: [number, number] | number

	/**
	 * setting fill will increase the elements's size by on a fraction of it's parent elements size
	 * * array with [xFill, yFill] values or single number that get expanded to [x, x]
	 * * (xFill * computed parent width) is added to width
	 * * (yFill * computed parent height) is added to height
	 * @defaultValue [0, 0]
	 */
	fill?: [number, number] | number

	/**
	 * when set this element's children will be treated like this element would have no {@link name}, even if it has a name defined
	 *
	 * useful if a "flat" resolving scheme is desired, for example when each element has a unique name and should be accessible
	 * via the root tree no matter how deep it is in the tree
	 *
	 * @defaultValue false
	 */
	noChildrenMap?: boolean

	/**
	 * elements with enabled set to false are not updated and not rendered
	 *
	 * @defaultValue true
	 */
	enabled?: boolean

	/**
	 * metadata allows storing arbitrary user data on the element object
	 *
	 * @remarks this will get copied into the created element's metadata object
	 *
	 * @defaultValue {}
	 */
	metadata?: Record<string, any>

	/**
	 * array of child elements to create in this element
	 *
	 * @defaultValue {}
	 */
	children?: CONFIG[]

	/** callback called each frame during layout update as long as the element is enabled */
	onUpdate?(element: SELF): void

	/** callback called before computing element position and dimensions, called during update only for elements marked as dirty */
	onBeforeLayoutResolve?(element: SELF): void

	/** callback called before updating the display object, after all child elements have been updated */
	onBeforeRedraw?(element: SELF): void

	/** callback called after updating the display object */
	onAfterRedraw?(element: SELF): void

	/**
	 * callback called once an element and all of it's children are created
	 */
	onCreated?(element: SELF): void
}

/**
 * The abstract layout element class
 * @typeParam CONFIG - the interface to use as the base layout element config
 * @typeParam BASE - the class to use as the base layout element class
 */
export abstract class LayoutElement<CONFIG extends LayoutElementConfig = any, BASE extends LayoutElement = any> {
	/** array of this elements child elements */
	public readonly children: BASE[]

	/** layout factory that was used to create this element */
	public readonly factory: LayoutFactory

	/** config object used to create this element */
	public readonly config: Readonly<LayoutElementConfig<CONFIG, this>>

	/** used for storing arbitrary user data on an element object */
	public readonly metadata: Record<string, any>

	/** {@inheritDoc LayoutElementConfig.onUpdate} */
	public onUpdateCallback?: <T extends this>(element: T) => void

	/** {@inheritDoc LayoutElementConfig.onBeforeLayoutResolve} */
	public onBeforeLayoutResolveCallback?: <T extends this>(element: T) => void

	/** {@inheritDoc LayoutElementConfig.onBeforeRedraw} */
	public onBeforeRedrawCallback?: <T extends this>(element: T) => void

	/** {@inheritDoc LayoutElementConfig.onAfterRedraw} */
	public onAfterRedrawCallback?: <T extends this>(element: T) => void

	protected _parent: BASE | null

	private readonly _childrenMap: Map<string, LayoutElement> | null

	private _parentChildrenMap: Map<string, LayoutElement> | null
	private _cachedWidth: number
	private _cachedHeight: number
	private _cachedTop: number
	private _cachedLeft: number

	protected _dirty: boolean
	protected _xAnchor: number
	protected _yAnchor: number
	protected _xOrigin: number
	protected _yOrigin: number
	protected _xFill: number
	protected _yFill: number

	protected _marginTop: number
	protected _marginLeft: number
	protected _paddingWidth: number
	protected _paddingHeight: number

	protected _enabled: boolean
	protected _scale: number
	protected _top: number | (<T extends this>(element: T) => number)
	protected _left: number | (<T extends this>(element: T) => number)
	protected _width: number | (<T extends this>(element: T) => number | null) | null
	protected _height: number | (<T extends this>(element: T) => number | null) | null

	/**
	 * constructor is protected as all class instances should be created via a {@link LayoutFactory}
	 */
	protected constructor(factory: LayoutFactory, config: Readonly<LayoutElementConfig>) {
		this.config = config
		this.factory = factory
		this._top = 0
		this._left = 0
		this._scale = 1
		this._xAnchor = 0
		this._yAnchor = 0
		this._xOrigin = 0
		this._yOrigin = 0
		this._xFill = 0
		this._yFill = 0
		this._width = null
		this._height = null
		this._marginTop = 0
		this._marginLeft = 0
		this._paddingWidth = 0
		this._paddingHeight = 0
		this._parent = null
		this._cachedTop = 0
		this._cachedLeft = 0
		this._cachedWidth = 0
		this._cachedHeight = 0
		this._enabled = true
		this._dirty = true
		this._childrenMap = null
		this._parentChildrenMap = null
		this.children = []
		this.metadata = {}
		if (config.name && !config.noChildrenMap) {
			this._childrenMap = new Map()
		}
		if (config.metadata) {
			Object.assign(this.metadata, config.metadata)
		}
		this.onUpdateCallback = config.onUpdate
		this.onBeforeLayoutResolveCallback = config.onBeforeLayoutResolve
		this.onBeforeRedrawCallback = config.onBeforeRedraw
		this.onAfterRedrawCallback = config.onAfterRedraw
		if (config.enabled === false) {
			this._enabled = false
		}
		if (config.top !== undefined) {
			this.top = config.top
		}
		if (config.left !== undefined) {
			this.left = config.left
		}
		if (config.width !== undefined) {
			this.width = config.width
		}
		if (config.height !== undefined) {
			this.height = config.height
		}
		if (config.marginLeft !== undefined) {
			this._marginLeft = config.marginLeft
		}
		if (config.marginTop !== undefined) {
			this._marginTop = config.marginTop
		}
		if (config.paddingWidth !== undefined) {
			this._paddingWidth = config.paddingWidth
		}
		if (config.paddingHeight !== undefined) {
			this._paddingHeight = config.paddingHeight
		}
		if (config.scale !== undefined) {
			this._scale = config.scale
		}
		if (config.anchor) {
			if (Array.isArray(config.anchor)) {
				this._xAnchor = config.anchor[0]
				this._yAnchor = config.anchor[1]
			} else {
				this._xAnchor = config.anchor
				this._yAnchor = config.anchor
			}
		}
		if (config.origin !== undefined) {
			if (Array.isArray(config.origin)) {
				this._xOrigin = config.origin[0]
				this._yOrigin = config.origin[1]
			} else {
				this._xOrigin = config.origin
				this._yOrigin = config.origin
			}
		}
		if (config.fill !== undefined) {
			if (Array.isArray(config.fill)) {
				this._xFill = config.fill[0]
				this._yFill = config.fill[1]
			} else {
				this._xFill = config.fill
				this._yFill = config.fill
			}
		}
	}

	private nameRemoveRecursion() {
		if (this._parentChildrenMap != null) {
			this._parentChildrenMap.delete(this.name!)
			if (this._childrenMap == null) {
				const children = this.children
				for (let i = 0; i < children.length; i += 1) {
					children[i].nameRemoveRecursion()
				}
			}
		}
	}

	private removeElement(element: BASE): boolean
	private removeElement(index: number): boolean
	private removeElement(arg: BASE | number) {
		const element = typeof arg == "number" ? this.children[arg] : arg
		const index = typeof arg == "number" ? arg : this.children.indexOf(element)
		if (index >= 0) {
			element.nameRemoveRecursion()
			this.onRemoveElement(index)
			element._parentChildrenMap = null
			element._parent = null
			this.children.splice(index, 1)
			this._dirty = true
			return true
		}
		return false
	}

	private getInsertionIndex(value: BASE | string | number) {
		if (typeof value == "number") {
			if (value < 0) {
				value = Math.max(-1, (this.children.length + 1) - value)
			}
			return value > this.children.length ? -1 : value
		} else if (typeof value == "string") {
			if (this._childrenMap == null) {
				return -1
			}
			const child = this._childrenMap.get(value)
			return child ? this.children.indexOf(child as BASE) : -1
		} else {
			return this.children.indexOf(value)
		}
	}

	/**
	 * function called before a child element is removed
	 *
	 * @param index - the index of the child element being removed
	 */
	protected onRemoveElement(index: number) {
	}

	/**
	 * function called before an child element is added
	 *
	 * @param element - the element being added
	 * @param index - the index on which the child is to be added
	 */
	protected onInsertElement(element: BASE, index: number) {
	}

	/**
	 * function called during the update cycle when the element was enabled and dirty
	 *
	 * @remarks this function should handle updating the actual display object
	 */
	protected onUpdate() {
	}

	/**
	 * This function gets called during the layout update cycle, normally there
	 * is not need to call it manually.
	 *
	 * updates values of:
	 * * {@link computedLeft}
	 * * {@link computedTop}
	 * * {@link computedWidth}
	 * * {@link computedHeight}
	 *
	 * @remarks this function assumes parent is not dirty, if you are unsure if parent is dirty
	 * use {@link updateComputedRecursive} instead.
	 *
	 * @returns `true` if {@link computedWidth} or {@link computedHeight} value has changed
	 */
	public updateComputed() {
		let dimensionsChanged = false
		let width = typeof this._width == "function" ? this._width(this) : this._width
		if (width === null) {
			width = this.contentWidth
		}
		if (this._xFill) {
			width += this._parent!._cachedWidth * this._xFill
		}
		width += this.paddingWidth
		if (this._cachedWidth != width) {
			this._cachedWidth = width
			dimensionsChanged = true
		}

		let height = typeof this._height == "function" ? this._height(this) : this._height
		if (height === null) {
			height = this.contentHeight
		}
		if (this._yFill) {
			height += this._parent!._cachedHeight * this._yFill
		}
		height += this.paddingHeight
		if (this._cachedHeight != height) {
			this._cachedHeight = height
			dimensionsChanged = true
		}

		let left = typeof this._left == "function" ? this._left(this) : this._left
		if (this._xOrigin) {
			left += this._xOrigin * this._parent!._cachedWidth
		}
		if (this._xAnchor) {
			left -= this._xAnchor * this._scale * this._cachedWidth
		}
		this._cachedLeft = left + this._marginLeft

		let top = typeof this._top == "function" ? this._top(this) : this._top
		if (this._yOrigin) {
			top += this._yOrigin * this._parent!._cachedHeight
		}
		if (this._yAnchor) {
			top -= this._yAnchor * this._scale * this._cachedHeight
		}
		this._cachedTop = top + this._marginTop
		return dimensionsChanged
	}

	/**
	 * Traverses the element tree upwards to the first non-dirty parent
	 * and calls {@link updateComputed} on all traversed elements.
	 */
	public updateComputedRecursive() {
		if (this._dirty) {
			if (this._parent) {
				this._parent.updateComputedRecursive()
			}
			this.updateComputed()
		}
	}

	/**
	 * this function should be called each frame on the root layout element to update the layout
	 */
	public update() {
		if (this._enabled) {
			if (this.onUpdateCallback) {
				this.onUpdateCallback(this)
			}
			if (this._dirty) {
				if (this.onBeforeLayoutResolveCallback) {
					this.onBeforeLayoutResolveCallback(this)
				}
				const dimensionsChanged = this.updateComputed()
				const children = this.children
				for (let i = 0; i < children.length; i += 1) {
					if (dimensionsChanged) {
						children[i]._dirty = true
					}
					children[i].update()
				}
				this._dirty = false
				if (this.onBeforeRedrawCallback) {
					this.onBeforeRedrawCallback(this)
				}
				this.onUpdate()
				if (this.onAfterRedrawCallback) {
					this.onAfterRedrawCallback(this)
				}
			} else {
				const children = this.children
				for (let i = 0; i < children.length; i += 1) {
					children[i].update()
				}
			}
		}
	}

	public insertElement<T extends BASE>(element: T, before?: BASE | string | number): T
	public insertElement<T extends BASE>(element: CONFIG, before?: BASE | string | number): T
	/**
	 * add a child element to this element
	 * * the child will be added at the end or at a specific position if `before` is specified
	 * * the child can be either an existing element or an config object that will be used to create a new element
	 * * the child will be removed from it's current parent if any
	 * * to add **after** a specific element `insertElement(x, y.parentIndex + 1)` can be used
	 *
	 * @throws when before is specified and target insertion point was not found / invalid
	 *
	 * @param element - existing element or a configuration object describing an object to create
	 * @param before - by default element gets added as the last child, when `before` is specified the element gets
	 * added **before** the specified target. The target can be:
	 * * a child element
	 * * a name of a child element
	 * * an numeric index
	 * * * 0 will add at the start
	 * * * 1 will add after the first element
	 * * * children.length will add at the end
	 * * * -1 will add at the end
	 * * * -2 will add before the last element
	 * * * -(children.length + 1) wil add at the start
	 *
	 * @returns the added element
	 */
	public insertElement(element: BASE & CONFIG, before?: BASE | string | number): BASE {
		if (!(element instanceof LayoutElement)) {
			return this.factory.create(element, this, before)
		}
		element._parent?.removeElement(element)
		element._parent = this as any
		const index = before !== undefined ? this.getInsertionIndex(before) : this.children.length
		if (index < 0) {
			throw new Error("insert target not found")
		}
		this.onInsertElement(element, index)
		if (index == this.children.length) {
			this.children.push(element)
		} else {
			this.children.splice(index, 0, element)
		}
		const childrenMap = this._childrenMap || this._parentChildrenMap
		if (childrenMap) {
			if (!element.name) {
				element._parentChildrenMap = childrenMap
			} else if (element.name[0] != "@") {
				element._parentChildrenMap = childrenMap
				childrenMap.set(element.name, element as LayoutElement)
			}
		}
		this._dirty = true
		return element
	}

	public insertElements(elements: BASE[], before?: BASE | string): void
	public insertElements(elements: CONFIG[], before?: BASE | string): void
	/**
	 * add a an array of children to this element
	 * * the children will be added (in order) at the end or at a specific position if `before` is specified
	 * * the children can be either an existing elements or configs object that will be used to create a new elements
	 * * the children will be removed from their current parents, if any
	 *
	 * @throws when before is specified and target insertion point was not found / invalid
	 *
	 * @param elements - array of existing element or configurations object describing objects to create
	 * @param before - by default elements get added in order after the last child, when `before` is specified the elements get
	 * added in order **before** the specified target. See {@link insertElement} for possible target values.
	 */
	public insertElements(elements: BASE[] & CONFIG[], before?: BASE | string) {
		if (elements.length > 0) {
			if (before == undefined) {
				for (let i = 0; i < elements.length; i += 1) {
					this.insertElement(elements[i])
				}
			} else {
				const index = this.insertElement(elements[0], before).parentIndex
				for (let i = 1; i < elements.length; i += 1) {
					this.insertElement(elements[i], index + i)
				}
			}
		}
	}

	public replaceElement<T extends BASE>(element: T, target: BASE | string): T
	public replaceElement<T extends BASE>(element: CONFIG, target: BASE | string): T
	/**
	 * replace an existing child with a different child
	 *
	 * @throws when target is invalid (not found or not direct child of current element)
	 *
	 * @param elements - the element to replace with, existing element or a configuration object describing an object to create
	 * @param target - the element to replace
	 * * must be direct child of current layer
	 * * a string value can be passed to find the child via it's name
	 */
	public replaceElement(element: BASE & CONFIG, target: BASE | string): BASE {
		const index = this.getInsertionIndex(target)
		if (index < 0) {
			throw new Error("replacement target not found")
		}
		this.children[index].delete()
		if (index == this.children.length) {
			return this.insertElement(element)
		} else {
			return this.insertElement(element, this.children[index])
		}
	}

	/** remove the element from the tree */
	public delete() {
		this._parent?.removeElement(this)
	}

	/**
	 * remove all children from this element
	 *
	 * @param offset - when passed only children with indexes >= offset will be removed
	 */
	public deleteChildren(offset = 0) {
		for (let i = this.children.length - 1; i >= offset; i--) {
			this.removeElement(i)
		}
	}

	/** remove all user data set on the metadata object */
	public purgeMetadata() {
		const metadata = this.metadata
		for (const key in metadata) {
			delete metadata[key]
		}
	}

	/** traverse the element tree downwards and execute a callback on each element, this element included */
	public forEach(callback: (element: BASE) => void) {
		callback(this as any)
		for (let i = 0; i < this.children.length; i += 1) {
			this.children[i].forEach(callback)
		}
	}

	/** returns `true` if this element is parent of the passed element */
	public isParentOf(child: BASE) {
		let parent = child._parent
		while (parent) {
			if (parent == (this as any)) {
				return true
			}
			parent = parent._parent
		}
		return false
	}

	/**
	 * returns `true` if the given path resolves to an element under current element
	 *
	 * equivalent to doing
	 * ```
	 * this.getElement(path, true) != null
	 * ```
	 * */
	public hasElement(path: string) {
		return this.getElement(path, true) != null
	}

	public getElement<T extends BASE>(path: string, noThrow?: false): T
	public getElement<T extends BASE>(path: string, noThrow: boolean): T | null
	/**
	 * Resolve elements based on their path.
	 *
	 * * elements are resolved via paths constructed from their and their parents names
	 * * unnamed elements are not resolvable, but their children are (via the first named parent in the tree).
	 * * names that start from `@` inform that the element and all of it's children should be not resolvable.
	 *
	 * Consider an example below:
	 *
	 * ```
	 * // root is an root element of the following element tree
	 * // (1)  foo
	 * // (2)  (unnamed)
	 * // (3)    bar
	 * // (4)      rab
	 * // (5)  @off
	 * // (6)    foo
	 *
	 * root.getElement("foo")     // 1
	 * root.getElement("bar")     // 3
	 * root.getElement("bar.rab") // 4
	 * root.getElement("bar.0")   // 4
	 * root.getElement("@off")    // error, not found (elements starting with '@' are not resolvable via name)
	 * root.getElement("4")       // 5
	 * root.getElement("4.foo")   // 6
	 * root.getElement("1.bar")   // 2
	 * root.getElement("1.bar")   // error, not found (can not resolve inside unnamed element)
	 * ```
	 *
	 * @param path - the path of the element to resolve.
	 * * path is constructed from element names
	 * * calling `e.getElement("foo.bar")` is the same as `e.getElement("foo").getElement("bar")`
	 * * `parent` can be used to reference the parent, `e.getElement("parent.foo")` is the same as `e.parent.getElement("foo")`
	 * * numeric values can be used to reference a child at a specific index `e.getElement("foo.1")` is the same as `e.getElement("foo").children[1]`
	 * * empty string (`""`) will always resolve to `this`
	 * @param noThrow - by default an exception is thrown when element is not found, when set to true null is returned instead
	 * @typeParam T - can be used to specify the type of the element that will be returned, by default the layout base type is used
	 *
	 * @returns the resolved element, if not found will throw exception or return `null` if `noThrow` is set
	 */
	public getElement<T extends BASE>(path: string, noThrow = false): T | null {
		if (!path) {
			// return this on empty string
			return this as LayoutElement as T
		}

		if (this._childrenMap) {
			// assume path is simply a name, this is an optimization to no execute the full function
			// in trivial cases
			const element = this._childrenMap.get(path)
			if (element) {
				// exit early if the assumption was correct
				return element as T
			}
		} else {
			// throw error when the element does not have a children map
			if (noThrow) {
				return null
			} else {
				throw new Error(`could not resolve '${path}'`)
			}
		}

		const items = path.split(".")
		let current = this as LayoutElement

		for (let i = 0; i < items.length; i += 1) {
			const item = items[i]
			const child = current._childrenMap?.get(item)
			if (child) {
				current = child
			} else if (item == "parent" && current._parent) {
				current = current._parent
			} else {
				const index = parseInt(item, 10)
				if (index >= 0 && current.children.length > index) {
					current = current.children[index]
				} else {
					if (noThrow) {
						return null
					} else {
						throw new Error(`could not resolve '${path}'`)
					}
				}
			}
		}

		return current as T
	}

	/**
	 * return the elements absolute path
	 *
	 * @param root - when passed a relative path to the specified parent element will be returned
	 */
	public getPath(root?: BASE) {
		if (this as any == root) {
			return ""
		}
		if (this.name) {
			const result = [this.name]
			let parent = this._parent
			while (parent && parent != root) {
				if (parent.name && parent._childrenMap) {
					result.push(parent.name)
				}
				parent = parent._parent
			}
			return result.reverse().join(".")
		} else {
			return undefined
		}
	}

	/** returns the root element (the first parent that has no parent) */
	public getRoot(): BASE {
		let element = this as LayoutElement
		while (true) {
			const parent = element._parent
			if (!parent) {
				return element as BASE
			}
			element = parent
		}
	}

	/** mark the element as dirty, this will force updating the display object next layout update pass */
	public setDirty() {
		this._dirty = true
	}

	/** check if the element is marked as dirty (object update pending) */
	public get dirty() {
		return this._dirty
	}

	/** get the element type, as was set in config used to create the element */
	public get type() {
		return this.config.type
	}

	/** get the element name, as was set in config used to create the element */
	public get name() {
		return this.config.name
	}

	/** the parent element, if no parent will return this element */
	public get parent() {
		return this._parent || this as LayoutElement as BASE
	}

	/**
	 * `true` if this layer has a parent
	 *
	 * same value can be obtained by doing
	 * ```
	 * this.parent !== this
	 * ```
	 */
	public get hasParent() {
		return this._parent != null
	}

	/**
	 * index under which this element is in it's parent {@link children} array, -1 if element has no parent
	 */
	public get parentIndex() {
		return this._parent ? this._parent.children.indexOf(this) : -1
	}


	/** {@inheritDoc LayoutElementConfig.enabled} */
	public get enabled() {
		return this._enabled
	}

	public set enabled(value: boolean) {
		if (this._enabled != value) {
			this._enabled = value
			this._dirty = true
		}
	}

	/** {@inheritDoc LayoutElementConfig.scale} */
	public set scale(value: number) {
		if (this._scale != value) {
			this._scale = value
			this._dirty = true
		}
	}

	public get scale() {
		return this._scale
	}

	/**
	 * element x position as set by user, for actual position see {@link computedLeft}
	 *
	 * @remarks will read 0 if set to a function
	 */
	public get left(): number {
		return typeof this._left == "number" ? this._left : 0
	}

	/**
	 * element x position
	 *
	 * if set to function the function will be called each update to compute the left value
	 */
	public set left(value: number | (<T extends this>(element: T) => number)) {
		if (value != this._left) {
			this._left = value
		}
		this._dirty = true
	}

	/**
	 * element y position  as set by user, for actual position see {@link computedTop}
	 *
	 * @remarks will read 0 if set to a function
	 */
	public get top(): number {
		return typeof this._top == "number" ? this._top : 0
	}

	/**
	 * element y position
	 *
	 * if set to a function the function will be called each update to compute the top value
	 */
	public set top(value: number | (<T extends this>(element: T) => number)) {
		if (this._top != value) {
			this._top = value
		}
		this._dirty = true
	}


	/**
	 * x offset added to final position value
	 */
	public get marginLeft() {
		return this._marginLeft
	}

	public set marginLeft(value: number) {
		if (this._marginLeft != value) {
			this._marginLeft = value
			this._dirty = true
		}
	}

	/**
	 * y offset added to final position value
	 */
	public get marginTop() {
		return this._marginTop
	}

	public set marginTop(value: number) {
		if (this._marginTop != value) {
			this._marginTop = value
			this._dirty = true
		}
	}

	/**
	 * element width as set by user, for actual element width see {@link computedWidth}
	 *
	 * @remarks will read 0 if set to a function or null
	 */
	public get width(): number {
		return typeof this._width == "number" ? this._width : 0
	}

	/**
	 * element width
	 *
	 * * if set to a function the function will be called each update to compute the width value
	 * * is set to null {@link hasWidth} will return null and {@link contentWidth} will be used to determine the element width
	 */
	public set width(value: number | null | (<T extends this>(element: T) => number | null)) {
		if (this._width !== value) {
			this._width = value
			this._dirty = true
		}
	}

	/**
	 * element height as set by user, for actual element width see {@link computedHeight}
	 *
	 * @remarks will read 0 if set to a function or null
	 */
	public get height(): number {
		return typeof this._height == "number" ? this._height : 0
	}

	/**
	 * element height
	 *
	 * * if set to a function the function will be called each update to compute the height value
	 * * is set to null {@link hasHeight} will return null and {@link contentHeight} will be used to determine the element height
	 */
	public set height(value: number | null | (<T extends this>(element: T) => number | null)) {
		if (this._height !== value) {
			this._height = value
			this._dirty = true
		}
	}

	/**
	 * width offset added to final width value
	 */
	public get paddingWidth() {
		return this._paddingWidth
	}

	public set paddingWidth(value: number) {
		if (this._paddingWidth != value) {
			this._paddingWidth = value
			this._dirty = true
		}
	}

	/**
	 * height offset added to final height value
	 */
	public get paddingHeight() {
		return this._paddingHeight
	}

	public set paddingHeight(value: number) {
		if (this._paddingHeight != value) {
			this._paddingHeight = value
			this._dirty = true
		}
	}

	/** used to get the element width when width is not set ({@link hasWidth} is false) */
	public get contentWidth() {
		return 0
	}

	/** used to get the element height when height is not set ({@link hasHeight} is false)*/
	public get contentHeight() {
		return 0
	}

	/** returns `true` if {@link width} is set to `null` */
	public get hasWidth() {
		return this._width !== null
	}

	/** returns `true` if {@link height} is set to `null` */
	public get hasHeight() {
		return this._height !== null
	}

	/**
	 * actual x position of the element calculated as
	 *
	 * ```
	 * // if left is numeric
	 * left + xOrigin * parent.computedWidth + marginLeft - xAnchor * scale * cachedWidth
	 *
	 * // if left is function
	 * left(this) + xOrigin * parent.computedWidth + marginLeft - xAnchor * scale * cachedWidth
	 * ```
	 *
	 * @remarks This value can be outdated if the element is marked as {@link dirty} as its updated only during the layout update cycle.
	 */
	public get computedLeft() {
		return this._cachedLeft
	}

	/**
	 * actual y position of the element calculated as
	 *
	 * ```
	 * // if top is numeric
	 * top + yOrigin * parent.computedHeight + marginTop - yAnchor * scale * cachedHeight
	 *
	 * // if top is function
	 * top(this) + yOrigin * parent.computedHeight + marginTop - yAnchor * scale * cachedHeight
	 * ```
	 *
	 * @remarks This value can be outdated if the element is marked as {@link dirty} as its updated only during the layout update cycle.
	 */
	public get computedTop() {
		return this._cachedTop
	}

	/**
	 * actual width of the element calculated as
	 *
	 * ```
	 * // if width is numeric
	 * width + xFill * parent.computedWidth + paddingWidth
	 *
	 * // if width is function
	 * width(this) + xFill * parent.computedWidth + paddingWidth
	 *
	 * // if width is null
	 * computedWidth + xFill * parent.computedWidth + paddingWidth
	 * ```
	 *
	 * @remarks This value can be outdated if the element is marked as {@link dirty} as its updated only during the layout update cycle.
	 */
	public get computedWidth() {
		return this._cachedWidth
	}

	/**
	 * actual height of the element calculated as
	 *
	 * ```
	 * // if height is numeric
	 * height + yFill * parent.computedHeight+ paddingHeight
	 *
	 * // if height is function
	 * height(this) + yFill * parent.computedHeight+ paddingHeight
	 *
	 * // if height is null
	 * computedHeight + yFill * parent.computedHeight+ paddingHeight
	 * ```
	 *
	 * @remarks This value can be outdated if the element is marked as {@link dirty} as its updated only during the layout update cycle.
	 */
	public get computedHeight(): number {
		return this._cachedHeight
	}

	/** x component of the anchor point (point on the element from which it's position is calculated) */
	public get xAnchor() {
		return this._xAnchor
	}

	public set xAnchor(value: number) {
		if (this._xAnchor != value) {
			this._xAnchor = value
			this._dirty = true
		}
	}

	/** y component of they anchor point (point on the element from which it's position is calculated) */
	public get yAnchor() {
		return this._yAnchor
	}

	public set yAnchor(value: number) {
		if (this._yAnchor != value) {
			this._yAnchor = value
			this._dirty = true
		}
	}

	/** x component of the origin point (point on the parent element from which this element's position is calculated) */
	public get xOrigin() {
		return this._xOrigin
	}

	public set xOrigin(value: number) {
		if (this._xOrigin != value) {
			this._xOrigin = value
			this._dirty = true
		}
	}

	/** y component of the origin point (point on the parent element from which this element's position is calculated) */
	public get yOrigin() {
		return this._yOrigin
	}

	public set yOrigin(value: number) {
		if (this._yOrigin != value) {
			this._yOrigin = value
			this._dirty = true
		}
	}

	/** how much of parent's width should be added to this elements width */
	public get xFill() {
		return this._xFill
	}

	public set xFill(value: number) {
		if (this._xFill != value) {
			this._xFill = value
			this._dirty = true
		}
	}

	/** how much of parent's height should be added to this elements height */
	public get yFill() {
		return this._yFill
	}

	public set yFill(value: number) {
		if (this._yFill != value) {
			this._yFill = value
			this._dirty = true
		}
	}
}

/**
 * Each element class should implement a static register method to match this interface.
 */
export interface ElementClassInterface {
	/**
	 * This method should register the element class on the factory instance passed in argument using
	 * this {@link LayoutFactory.register} method.
	 *
	 * @param layoutFactory - the factory that the element class should register on
	 */
	register(layoutFactory: LayoutFactory): void
}

/**
 * A factory function for an given element class.
 *
 * @param config - the config object from which the element class should be crated
 *
 * @typeParam SELF - the type of the created instance
 * @typeParam CONFIG - the config object type
 *
 * @returns created element class instance
 */
export type LayoutConstructor<SELF extends LayoutElement, CONFIG extends LayoutElementConfig> = (config: CONFIG) => SELF

/**
 * The factory class used to crate layout elements from config objects
 *
 * @typeParam BASE - the layout base class
 * @typeParam CONFIG - the config object type
 */
export class LayoutFactory<BASE extends LayoutElement = any, CONFIG extends LayoutElementConfig = any> {
	private _constructors: Map<string, LayoutConstructor<BASE, CONFIG>> = new Map()

	private createElement(config: CONFIG): BASE {
		const constructor = this._constructors.get(config.type)
		if (!constructor) {
			throw new Error(`unknown layout type '${config.type}'`)
		}
		return constructor(config)
	}

	/**
	 * this function should be used only inside the static {@link ElementClassInterface.register | register} methods
	 * defined on element classes
	 *
	 * @param type - the unique type name of the element class being registered on the factory
	 * @param constructor - the factory function that will create an element class instance of that type based on config
	 */
	public register(type: string, constructor: LayoutConstructor<BASE, CONFIG>) {
		this._constructors.set(type, constructor)
	}

	/**
	 * add a single element class to this factory, element classes have to be added to the factory before
	 * elements of their type can be created.
	 */
	public addElementClass(element: ElementClassInterface ) {
		element.register(this)
	}

	/**
	 * add a multiple element class to this factory, element classes have to be added to the factory before
	 * elements of their type can be created.
	 */
	public addElementClasses(elements: ElementClassInterface[]) {
		for (let i = 0; i < elements.length; i += 1) {
			elements[i].register(this)
		}
	}

	/**
	 * crate an element based on config and insert it into a layout tree
	 *
	 * @remarks {@LayoutElementConfig.onCreated} is called by this function
	 *
	 * @param config - the element config to use
	 * @param parent - parent element to which the new element should be added
	 * @param before - position at which element should be added, see {@link LayoutElement.insertElement} description
	 *
	 * @returns the created element
	 */
	public create(config: CONFIG, parent?: BASE, before?: BASE | string | number): BASE {
		const root = this.createElement(config)
		if (parent) {
			parent.insertElement(root, before)
		}
		const children = config.children
		if (children) {
			for (let i = 0; i < children.length; i += 1) {
				this.create(children[i], root)
			}
		}
		if (root.config.onCreated) {
			root.config.onCreated(root)
		}
		return root
	}
}
