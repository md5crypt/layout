export interface PositioningBox {
	top?: number
	left?: number
	bottom?: number
	right?: number
	vertical?: number
	horizontal?: number
}

export type LayoutElementCallback<T extends LayoutElement> = (element: T) => void
export type LayoutElementPositionCallback<T extends LayoutElement> = (element: T) => number
export type LayoutElementSizeCallback<T extends LayoutElement> = (element: T) => number

export interface LayoutElementConfig<CONFIG extends LayoutElementConfig = any, SELF extends LayoutElement = any> {
	type: string
	name?: string
	top?: number | LayoutElementPositionCallback<SELF>
	left?: number | LayoutElementPositionCallback<SELF>
	width?: number | LayoutElementSizeCallback<SELF>
	height?: number | LayoutElementSizeCallback<SELF>
	marginLeft?: number
	marginTop?: number
	paddingWidth?: number
	paddingHeight?: number
	scale?: number
	anchor?: [number, number] | number
	origin?: [number, number] | number
	fill?: [number, number] | number
	noChildrenMap?: boolean
	volatile?: boolean
	enabled?: boolean
	metadata?: Record<string, any>
	children?: CONFIG[]
	onUpdate?: LayoutElementCallback<SELF>
	onBeforeLayoutResolve?: LayoutElementCallback<SELF>
	onBeforeRedraw?: LayoutElementCallback<SELF>
	onAfterRedraw?: LayoutElementCallback<SELF>
	onAttach?: LayoutElementCallback<SELF>
}

export abstract class LayoutElement<CONFIG extends LayoutElementConfig = any, BASE extends LayoutElement = any> {
	public readonly children: BASE[]
	public readonly factory: LayoutFactory
	public readonly metadata: Record<string, any>
	public readonly config: Readonly<LayoutElementConfig<CONFIG, this>>

	public onUpdateCallback?: <T extends this>(element: T) => void
	public onBeforeLayoutResolveCallback?: <T extends this>(element: T) => void
	public onBeforeRedrawCallback?: <T extends this>(element: T) => void
	public onAfterRedrawCallback?: <T extends this>(element: T) => void
	public onAttachCallback?: <T extends this>(element: T) => void

	protected _parent: BASE | null

	private readonly _childrenMap: Map<string, LayoutElement> | null

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
	protected _volatile: boolean

	public constructor(factory: LayoutFactory, config: Readonly<LayoutElementConfig>) {
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
		this._volatile = false
		this._parent = null
		this._cachedTop = 0
		this._cachedLeft = 0
		this._cachedWidth = 0
		this._cachedHeight = 0
		this._enabled = true
		this._dirty = true
		this._childrenMap = null
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
		this.onAttachCallback = config.onAttach
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
		if (config.volatile !== undefined) {
			this._volatile = config.volatile
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

	private nameAdd(element: BASE) {
		if (this._childrenMap) {
			this._childrenMap.set(element.name!, element)
		} else if (this._parent) {
			this._parent.nameAdd(element)
		}
	}

	private nameRemove(element: BASE) {
		if (this._childrenMap) {
			this._childrenMap.delete(element.name!)
		} else if (this._parent) {
			this._parent.nameRemove(element)
		}
	}

	private nameRemoveRecursion(element: BASE) {
		if (element.name) {
			if (element.name[0] != "@") {
				this.nameRemove(element)
			}
		} else {
			element.children.forEach(element => this.nameRemoveRecursion(element))
		}
	}

	private removeElement(element: BASE): boolean
	private removeElement(index: number): boolean
	private removeElement(arg: BASE | number) {
		const element = typeof arg == "number" ? this.children[arg] : arg
		const index = typeof arg == "number" ? arg : this.children.indexOf(element)
		if (index >= 0) {
			this.nameRemoveRecursion(element)
			this.onRemoveElement(index)
			this.children.splice(index, 1)
			this._dirty = true
			return true
		}
		return false
	}

	protected onRemoveElement(_index: number) {
		// no-op by default
	}

	protected onInsertElement(_element: BASE, _index: number) {
		// no-op by default
	}

	protected onUpdate() {
		// no-op by default
	}

	protected onAttach?(): void

	public update() {
		if (this._enabled) {
			if (this.onUpdateCallback) {
				this.onUpdateCallback(this)
			}
			if (this._dirty) {
				if (this.onBeforeLayoutResolveCallback) {
					this.onBeforeLayoutResolveCallback(this)
				}
				this.resolveLayout()
				const children = this.children
				for (let i = 0; i < children.length; i += 1) {
					if (this._volatile) {
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

	public resolveLayout() {
		let width = typeof this._width == "function" ? this._width(this) : this._width
		if (width === null) {
			width = this.contentWidth
		}
		if (this._xFill) {
			width += this._parent!._cachedWidth * this._xFill
		}
		this._cachedWidth = width + this.paddingWidth

		let height = typeof this._height == "function" ? this._height(this) : this._height
		if (height === null) {
			height = this.contentHeight
		}
		if (this._yFill) {
			height += this._parent!._cachedHeight * this._yFill
		}
		this._cachedHeight = height + this.paddingHeight

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
	}

	public replaceElement(element: CONFIG, old: BASE | string): BASE
	public replaceElement(element: BASE, old: BASE | string): BASE
	public replaceElement(element: CONFIG & BASE, old: BASE | string): BASE {
		const index = this.children.indexOf(typeof old == "string" ? this.getElement(old) : old)
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

	public insertElement(element: BASE, before?: BASE | string | number): BASE
	public insertElement(element: CONFIG, before?: BASE | string | number): BASE
	public insertElement(element: CONFIG & BASE, before?: BASE | string | number): BASE {
		if (!(element instanceof LayoutElement)) {
			return this.factory.create(element, this, before)
		}
		element._parent?.removeElement(element)
		element._parent = this as any
		let index = this.children.length
		if (before !== undefined) {
			if (typeof before == "number") {
				index = Math.min(before, this.children.length)
			} else if (typeof before == "string") {
				index = this.children.indexOf(this.getElement(before))
			} else {
				index = this.children.indexOf(before)
			}
			if (index < 0) {
				index = Math.max(0, (this.children.length + 1) - index)
			}
		}
		this.onInsertElement(element, index)
		if (index == this.children.length) {
			this.children.push(element)
		} else {
			this.children.splice(index, 0, element)
		}
		if (element.name && (element.name[0] != "@")) {
			this.nameAdd(element)
		}
		this._dirty = true
		return element
	}

	public insertElements(elements: BASE[], before?: BASE | string): void
	public insertElements(elements: CONFIG[], before?: BASE | string): void
	public insertElements(elements: (CONFIG & BASE)[], before?: BASE | string) {
		if (elements.length == 0) {
			return
		}
		if (before == undefined) {
			elements.forEach(x => this.insertElement(x))
		} else {
			const index = this.insertElement(elements[0], before).parentIndex
			for (let i = 1; i < elements.length; i += 1) {
				this.insertElement(elements[i], index + i)
			}
		}
	}

	public delete() {
		this._parent?.removeElement(this)
		this._parent = null
	}

	public deleteChildren(offset = 0) {
		for (let i = this.children.length - 1; i >= offset; i--) {
			this.removeElement(i)
		}
	}

	public purgeMetadata() {
		const metadata = this.metadata
		for (const key in metadata) {
			delete metadata[key]
		}
	}

	public forEach(callback: (element: BASE) => void) {
		callback(this as any)
		for (let i = 0; i < this.children.length; i += 1) {
			this.children[i].forEach(callback)
		}
	}

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

	public hasElement(name: string) {
		return this.getElement(name, true) != null
	}

	public getElement<L extends BASE>(name: string, noThrow?: false): L
	public getElement<L extends BASE>(name: string, noThrow: boolean): L | null
	public getElement<L extends BASE>(name: string, noThrow = false): L | null {
		if (!name) {
			return this as any
		} else if (!this._childrenMap) {
			return this.parent.getElement<L>(name, noThrow)
		}
		const path = name.split(".")
		let current = this as LayoutElement
		for (let i = 0; i < path.length; i += 1) {
			const child = current._childrenMap ? current._childrenMap.get(path[i]) : null
			if (child) {
				current = child
			} else if (path[i] == "parent" && current._parent) {
				current = current._parent
			} else {
				const index = Number(path[i])
				if (!isFinite(index) || index < 0 || current.children.length <= index) {
					if (noThrow) {
						return null
					} else {
						throw new Error(`could not resolve '${name}'`)
					}
				} else {
					current = current.children[index]
				}
			}
		}
		return current as L
	}

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

	public setDirty() {
		this._dirty = true
	}

	public setAnchor(x: number, y?: number) {
		this.xAnchor = x
		this.yAnchor = y === undefined ? x : y
	}

	public setOrigin(x: number, y?: number) {
		this.xOrigin = x
		this.yOrigin = y === undefined ? x : y
	}

	public setFill(x: number, y?: number) {
		this.xFill = x
		this.yFill = y === undefined ? x : y
	}

	public get dirty() {
		return this._dirty
	}

	public get type() {
		return this.config.type
	}

	public get name() {
		return this.config.name
	}

	public get parent() {
		return this._parent || this as LayoutElement as BASE
	}

	public get hasParent() {
		return this._parent != null
	}

	public get parentIndex() {
		return this._parent ? this._parent.children.indexOf(this) : -1
	}

	public get enabled() {
		return this._enabled
	}

	public set enabled(value: boolean) {
		if (this._enabled != value) {
			this._enabled = value
			this._dirty = true
		}
	}

	public get treeEnabled() {
		if (!this._enabled) {
			return false
		}
		let parent = this._parent
		while (parent) {
			if (!parent._enabled) {
				return false
			}
			parent = parent._parent
		}
		return true
	}

	public get volatile() {
		return this._volatile
	}

	public set volatile(value: boolean) {
		if (this._volatile != value) {
			this._volatile = value
			this._dirty = true
		}
	}

	public set scale(value: number) {
		if (this._scale != value) {
			this._scale = value
			this._dirty = true
		}
	}

	public get scale() {
		return this._scale
	}

	public get globalScale() {
		let scale = this.scale
		let element = this._parent
		while (element) {
			scale *= element.scale
			element = element._parent
		}
		return scale
	}

	public get contentWidth() {
		return 0
	}

	public get contentHeight() {
		return 0
	}

	public get left(): number {
		return typeof this._left == "number" ? this._left : 0
	}

	public set left(value: number | (<T extends this>(element: T) => number)) {
		if (value != this._left) {
			this._left = value
		}
		this._dirty = true
	}

	public get top(): number {
		return typeof this._top == "number" ? this._top : 0
	}

	public set top(value: number | (<T extends this>(element: T) => number)) {
		if (this._top != value) {
			this._top = value
		}
		this._dirty = true
	}

	public get width(): number {
		return typeof this._width == "number" ? this._width : 0
	}

	public set width(value: number | null | (<T extends this>(element: T) => number | null)) {
		if (this._width !== value) {
			this._width = value
			this._dirty = true
		}
	}

	public get height(): number {
		return typeof this._height == "number" ? this._height : 0
	}

	public set height(value: number | null | (<T extends this>(element: T) => number | null)) {
		if (this._height !== value) {
			this._height = value
			this._dirty = true
		}
	}

	public get hasWidth() {
		return this._width !== null
	}

	public get hasHeight() {
		return this._height !== null
	}

	public get computedLeft() {
		return this._cachedLeft
	}

	public get computedTop() {
		return this._cachedTop
	}

	public get computedHeight(): number {
		return this._cachedHeight
	}

	public get computedWidth() {
		return this._cachedWidth
	}

	public get marginLeft() {
		return this._marginLeft
	}

	public set marginLeft(value: number) {
		if (this._marginLeft != value) {
			this._marginLeft = value
			this._dirty = true
		}
	}

	public get marginTop() {
		return this._marginTop
	}

	public set marginTop(value: number) {
		if (this._marginTop != value) {
			this._marginTop = value
			this._dirty = true
		}
	}

	public get paddingWidth() {
		return this._paddingWidth
	}

	public set paddingWidth(value: number) {
		if (this._paddingWidth != value) {
			this._paddingWidth = value
			this._dirty = true
		}
	}

	public get paddingHeight() {
		return this._paddingHeight
	}

	public set paddingHeight(value: number) {
		if (this._paddingHeight != value) {
			this._paddingHeight = value
			this._dirty = true
		}
	}

	public get xAnchor() {
		return this._xAnchor
	}

	public set xAnchor(value: number) {
		if (this._xAnchor != value) {
			this._xAnchor = value
			this._dirty = true
		}
	}

	public get yAnchor() {
		return this._yAnchor
	}

	public set yAnchor(value: number) {
		if (this._yAnchor != value) {
			this._yAnchor = value
			this._dirty = true
		}
	}

	public get xOrigin() {
		return this._xOrigin
	}

	public set xOrigin(value: number) {
		if (this._xOrigin != value) {
			this._xOrigin = value
			this._dirty = true
		}
	}

	public get yOrigin() {
		return this._yOrigin
	}

	public set yOrigin(value: number) {
		if (this._yOrigin != value) {
			this._yOrigin = value
			this._dirty = true
		}
	}

	public get xFill() {
		return this._xFill
	}

	public set xFill(value: number) {
		if (this._xFill != value) {
			this._xFill = value
			this._dirty = true
		}
	}

	public get yFill() {
		return this._yFill
	}

	public set yFill(value: number) {
		if (this._yFill != value) {
			this._yFill = value
			this._dirty = true
		}
	}

	public get globalBoundingBox() {
		const result = {
			top: this._cachedTop,
			left: this._cachedLeft,
			width: 0,
			height: 0
		}
		if (this._width == null) {
			const bounds = this.horizontalBounds
			result.left -= result.left - bounds[0]
			result.width = bounds[1] - bounds[0]
		} else {
			result.width = this._cachedWidth * this._scale
		}
		if (this._height == null) {
			const bounds = this.verticalBounds
			result.top -= result.top - bounds[0]
			result.height = bounds[1] - bounds[0]
		} else {
			result.height = this._cachedHeight * this._scale
		}
		let parent = this._parent
		while (parent) {
			if (parent._scale) {
				result.top = (result.top * parent._scale) + parent._cachedTop
				result.left = (result.left * parent._scale) + parent._cachedLeft
				result.width *= parent._scale
				result.height *= parent._scale
			} else {
				result.top += parent._cachedTop
				result.left += parent._cachedLeft
			}
			parent = parent._parent
		}
		return result
	}

	public get horizontalBounds() {
		const width = this._cachedWidth * this._scale
		const offset = this._cachedLeft
		if (width || this._width === 0) {
			return [offset, offset + width]
		}
		let min = Infinity
		let max = -Infinity
		for (const child of this.children) {
			if (child.enabled) {
				const bounds = child.horizontalBounds
				min = Math.min(min, bounds[0])
				max = Math.max(max, bounds[1])
			}
		}
		min *= this._scale
		max *= this._scale
		return isFinite(min + max) ? [offset + min, offset + max] : [offset, offset]
	}

	public get verticalBounds() {
		const height = this._cachedHeight * this._scale
		const offset = this._cachedTop
		if (height || this._height === 0) {
			return [offset, offset + height]
		}
		let min = Infinity
		let max = -Infinity
		for (const child of this.children) {
			if (child.enabled) {
				const bounds = child.verticalBounds
				min = Math.min(min, bounds[0])
				max = Math.max(max, bounds[1])
			}
		}
		min *= this._scale
		max *= this._scale
		return isFinite(min + max) ? [offset + min, offset + max] : [offset, offset]
	}
}

export type LayoutConstructor<BASE extends LayoutElement, CONFIG extends LayoutElementConfig> = (config: CONFIG) => BASE

export interface ElementClassInterface {
	register(layoutFactory: LayoutFactory): void
}

export class LayoutFactory<BASE extends LayoutElement = any, CONFIG extends LayoutElementConfig = any> {
	private constructors: Map<string, LayoutConstructor<BASE, CONFIG>> = new Map()

	public addElementClass(element: ElementClassInterface ) {
		element.register(this)
	}

	public addElementClasses(elements: ElementClassInterface[]) {
		elements.forEach(x => x.register(this))
	}

	public register(type: string, constructor: LayoutConstructor<BASE, CONFIG>) {
		this.constructors.set(type, constructor)
	}

	public createElement(config: CONFIG): BASE {
		const constructor = this.constructors.get(config.type)
		if (!constructor) {
			throw new Error(`unknown layout type '${config.type}'`)
		}
		return constructor(config)
	}

	public create(config: CONFIG, parent?: BASE, before?: BASE | string | number): BASE {
		const root = this.createElement(config)
		if (parent) {
			parent.insertElement(root, before)
		}
		if (config.children) {
			config.children.forEach(element => this.create(element, root))
		}
		if (root.onAttachCallback) {
			root.onAttachCallback(root)
		}
		return root
	}
}
