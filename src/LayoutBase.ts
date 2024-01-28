export interface ResolvedPositioningBox {
	top: number
	left: number
	bottom: number
	right: number
}

export interface PositioningBox extends Partial<ResolvedPositioningBox> {
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
	width?: number | string | LayoutElementSizeCallback<SELF>
	height?: number | string | LayoutElementSizeCallback<SELF>
	scale?: number
	anchor?: [number, number] | number
	origin?: [number, number] | number
	fill?: [number, number] | number
	padding?: PositioningBox | number
	margin?: PositioningBox | number
	flexMode?: "none" | "horizontal" | "vertical"
	flexHorizontalAlign?: "left" | "right" | "center"
	flexVerticalAlign?: "top" | "bottom" | "middle"
	flexGrow?: number
	ignoreLayout?: boolean
	noChildrenMap?: boolean
	volatile?: boolean
	enabled?: boolean
	metadata?: Record<string, any>
	children?: CONFIG[]
	onUpdate?: LayoutElementCallback<SELF>
	onBeforeLayoutResolve?: LayoutElementCallback<SELF>
	onBeforeRedraw?: LayoutElementCallback<SELF>
	onAfterRedraw?: LayoutElementCallback<SELF>
	onEnable?: LayoutElementCallback<SELF>
	onDisable?: LayoutElementCallback<SELF>
	onDetach?: LayoutElementCallback<SELF>
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
	public onEnableCallback?: <T extends this>(element: T) => void
	public onDisableCallback?: <T extends this>(element: T) => void
	public onDetachCallback?: <T extends this>(element: T) => void
	public onAttachCallback?: <T extends this>(element: T) => void

	private _cachedWidth: number | null
	private _cachedHeight: number | null
	private _cachedTop: number | null
	private _cachedLeft: number | null
	private _dirty: boolean
	private _xAnchor: number
	private _yAnchor: number
	private _xOrigin: number
	private _yOrigin: number
	private _xFill: number
	private _yFill: number
	private _layoutReady: boolean
	private readonly _childrenMap: Map<string, LayoutElement> | null

	protected _parent: BASE | null
	protected _enabled: boolean
	protected _scale: number
	protected _parentScale: number
	protected _top: number | (<T extends this>(element: T) => number)
	protected _left: number | (<T extends this>(element: T) => number)
	protected _width: number | (<T extends this>(element: T) => number | null) | null
	protected _height: number | (<T extends this>(element: T) => number | null) | null
	protected _padding: ResolvedPositioningBox
	protected _margin: ResolvedPositioningBox
	protected _flexMode: "none" | "horizontal" | "vertical"
	protected _flexHorizontalAlign: "left" | "right" | "center"
	protected _flexVerticalAlign: "top" | "bottom" | "middle"
	protected _flexGrow: number
	protected _ignoreLayout: boolean
	protected _volatile: boolean

	public static resolvePositioningBox(value: PositioningBox | number): ResolvedPositioningBox {
		if (typeof value == "number") {
			return { top: value, left: value, bottom: value, right: value }
		} else {
			return {
				top: value.top === undefined ? (value.vertical || 0) : value.top,
				left: value.left === undefined ? (value.horizontal || 0) : value.left,
				bottom: value.bottom === undefined ? (value.vertical || 0) : value.bottom,
				right: value.right === undefined ? (value.horizontal || 0) : value.right
			}
		}
	}

	public constructor(factory: LayoutFactory, config: Readonly<LayoutElementConfig>) {
		this.config = config
		this.factory = factory
		this._top = 0
		this._left = 0
		this._scale = 1
		this._parentScale = 1
		this._xAnchor = 0
		this._yAnchor = 0
		this._xOrigin = 0
		this._yOrigin = 0
		this._xFill = 0
		this._yFill = 0
		this._width = null
		this._height = null
		this._padding = {top: 0, left: 0, bottom: 0, right: 0}
		this._margin = {top: 0, left: 0, bottom: 0, right: 0}
		this._flexMode = "none"
		this._flexHorizontalAlign = "left"
		this._flexVerticalAlign = "top"
		this._flexGrow = 0
		this._ignoreLayout = false
		this._volatile = false
		this._parent = null
		this._cachedTop = null
		this._cachedLeft = null
		this._cachedWidth = null
		this._cachedHeight = null
		this._enabled = true
		this._dirty = true
		this._layoutReady = false
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
		this.onEnableCallback = config.onEnable
		this.onDisableCallback = config.onDisable
		this.onDetachCallback = config.onDetach
		this.onAttachCallback = config.onAttach
		if (config.enabled === false) {
			this._enabled = false
		}
		if (config.top !== undefined) {
			this.setTop(config.top)
		}
		if (config.left !== undefined) {
			this.setLeft(config.left)
		}
		if (config.width !== undefined) {
			this.setWidth(config.width)
		}
		if (config.height !== undefined) {
			this.setHeight(config.height)
		}
		if (config.padding !== undefined) {
			this.setPadding(config.padding)
		}
		if (config.margin !== undefined) {
			this.setMargin(config.margin)
		}
		if (config.flexMode !== undefined) {
			this.flexMode = config.flexMode
		}
		if (config.flexHorizontalAlign !== undefined) {
			this.flexHorizontalAlign = config.flexHorizontalAlign
		}
		if (config.flexVerticalAlign !== undefined) {
			this.flexVerticalAlign = config.flexVerticalAlign
		}
		if (config.flexGrow !== undefined) {
			this.flexGrow = config.flexGrow
		}
		if (config.ignoreLayout !== undefined) {
			this.ignoreLayout = config.ignoreLayout
		}
		if (config.volatile !== undefined) {
			this.volatile = config.volatile
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

	private detachRecursion() {
		for (let i = 0; i < this.children.length; i += 1) {
			this.children[i].detachRecursion()
		}
		if (this.onDetach) {
			this.onDetach()
		}
		if (this.onDetachCallback) {
			this.onDetachCallback(this as any)
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
			this.setDirty()
			element.detachRecursion()
			return true
		}
		return false
	}

	private onEnableStateChange(value: boolean) {
		if (value) {
			if (this.onEnableCallback) {
				this.onEnableCallback(this as any)
			}
		} else {
			if (this.onDisableCallback) {
				this.onDisableCallback(this as any)
			}
		}
		this.children.forEach(x => x.onEnableStateChange(value))
	}

	private get childrenHeight() {
		const children = this.children
		let value = 0
		for (let i = 0; i < children.length; i += 1) {
			const element = children[i]
			value += (element._ignoreLayout || !element._enabled) ? 0 : element.outerHeight
		}
		return value
	}

	private get childrenMaxHeight() {
		const children = this.children
		let value = 0
		for (let i = 0; i < children.length; i += 1) {
			const element = children[i]
			value = Math.max(value, (element._ignoreLayout || !element._enabled) ? 0 : element.outerHeight)
		}
		return value
	}

	private get childrenWidth() {
		const children = this.children
		let value = 0
		for (let i = 0; i < children.length; i += 1) {
			const element = children[i]
			value += (element._ignoreLayout || !element._enabled) ? 0 : element.outerWidth
		}
		return value
	}

	private get childrenMaxWidth(): number {
		const children = this.children
		let value = 0
		for (let i = 0; i < children.length; i += 1) {
			const element = children[i]
			value = Math.max(value, (element._ignoreLayout || !element._enabled) ? 0 : element.outerWidth)
		}
		return value
	}

	protected resolveLayout() {
		if (this._layoutReady || this._flexMode == "none") {
			this._layoutReady = true
			return // nothing to do
		}
		let growCount = this.children.reduce((value, element) => value + (element._enabled ? element._flexGrow : 0), 0)
		if (this._flexMode == "horizontal") {
			const width = this.innerWidth
			let growPool = width - this.childrenWidth
			let xOffset = 0
			if (!growCount && (this._flexHorizontalAlign != "left")) {
				xOffset += this._flexHorizontalAlign == "center" ? growPool / 2 : growPool
			}
			const growFactor = growCount ? growPool / growCount : 0
			for (const element of this.children) {
				if (!element._enabled || element._ignoreLayout) {
					continue
				}
				if (element._flexGrow) {
					const amount = growCount > 1 ? Math.floor(growFactor * element._flexGrow) : growPool
					growCount -= 1
					growPool -= amount
					element._cachedWidth = element.width + amount
					element._cachedHeight = null
				}
				element._cachedTop = element.top
				element._cachedLeft = xOffset + element.left
				element._dirty = true
				xOffset += element.outerWidth
			}
			this._layoutReady = true
			const height = this.innerHeight
			for (const element of this.children) {
				if (this._enabled && !element._ignoreLayout && (this._flexVerticalAlign != "top")) {
					const diff = height - element.outerHeight
					element._cachedTop! += this._flexVerticalAlign == "middle" ? diff / 2 : diff
				}
			}
		} else {
			const height = this.innerHeight
			let growPool = height - this.childrenHeight
			let yOffset = 0
			if (!growCount && (this._flexVerticalAlign != "top")) {
				yOffset += this._flexVerticalAlign == "middle" ? growPool / 2 : growPool
			}
			const growFactor = growCount ? growPool / growCount : 0
			for (const element of this.children) {
				if (!element._enabled || element._ignoreLayout) {
					continue
				}
				if (element._flexGrow) {
					const amount = growCount > 1 ? Math.floor(growFactor * element._flexGrow) : growPool
					growCount -= 1
					growPool -= amount
					element._cachedHeight = element.height + amount
					element._cachedWidth = null
				}
				element._cachedLeft = element.left
				element._cachedTop = yOffset + element.top
				element._dirty = true
				yOffset += element.outerHeight
			}
			this._layoutReady = true
			const width = this.innerWidth
			for (const element of this.children) {
				if (this._enabled && !element._ignoreLayout && (this._flexHorizontalAlign != "left")) {
					const diff = width - element.outerWidth
					element._cachedLeft! += this._flexHorizontalAlign == "center" ? diff / 2 : diff
				}
			}
		}
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

	protected onDetach?(): void
	protected onAttach?(): void
	protected onEnable?(): void
	protected onDisable?(): void

	public update() {
		if (this._enabled) {
			if (this.onUpdateCallback) {
				this.onUpdateCallback(this as any)
			}
			if (this._dirty) {
				if (this.onBeforeLayoutResolveCallback) {
					this.onBeforeLayoutResolveCallback(this as any)
				}
				this.resolveLayout()
				this.children.forEach(element => element.update())
				this._dirty = false
				if (this.onBeforeRedrawCallback) {
					this.onBeforeRedrawCallback(this as any)
				}
				this.onUpdate()
				if (this.onAfterRedrawCallback) {
					this.onAfterRedrawCallback(this as any)
				}
			} else {
				this.children.forEach(element => element.update())
			}
		}
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
		this.setDirty()
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
		this._parent?.removeElement(this as any)
		this._parent = null
	}

	public deleteChildren(offset = 0) {
		for (let i = this.children.length - 1; i >= offset; i--) {
			this.removeElement(i)
		}
	}

	public purgeMetadata() {
		Object.keys(this.metadata).forEach(x => delete this.metadata[x])
	}

	public forEach(callback: (element: BASE) => void) {
		callback(this as any)
		for (let i = 0; i < this.children.length; i += 1) {
			this.children[i].forEach(callback)
		}
	}

	public onScaleChange(parentScale: number) {
		this._parentScale = parentScale
		for (let i = 0; i < this.children.length; i += 1) {
			this.children[i].onScaleChange(parentScale * this._scale)
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
	public getElement<L extends BASE>(name: string, noThrow: true): L | null
	public getElement<L extends BASE>(name: string, noThrow = false): L | null {
		if (!name) {
			return this as any
		} else if (!this._childrenMap) {
			return this.parent.getElement<L>(name, noThrow as false)
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

	public getElementPath() {
		const list = [this as LayoutElement]
		let parent = this._parent
		while (parent) {
			list.push(parent)
			parent = parent._parent
		}
		return list.reverse()
	}

	public getRoot(): BASE {
		let element = this as LayoutElement
		while (true) {
			if (element.type == "root") {
				return element as BASE
			}
			const parent = element._parent
			if (!parent) {
				return element as BASE
			}
			element = parent
		}
	}

	public setDirty(force?: boolean) {
		if (!this._dirty || force) {
			this._cachedTop = null
			this._cachedLeft = null
			this._cachedWidth = null
			this._cachedHeight = null
			this._dirty = true
			this._layoutReady = false
			if (this._flexMode != "none" || this._volatile) {
				for (let i = 0; i < this.children.length; i += 1) {
					this.children[i].setDirty(force)
				}
			}
			if (this.parentLayout != "none") {
				this._parent!.setDirty()
			}
			return true
		}
		return false
	}

	public setMargin(value: PositioningBox | number) {
		this._margin = LayoutElement.resolvePositioningBox(value)
		this.setDirty()
	}

	public setPadding(value: PositioningBox | number) {
		this._padding = LayoutElement.resolvePositioningBox(value)
		this.setDirty()
	}

	public setTop(value: number | (<T extends this>(element: T) => number)) {
		if (this._top != value) {
			this._top = value
		}
		this.setDirty(this._cachedTop !== null)
	}

	public setLeft(value: number | (<T extends this>(element: T) => number)) {
		if (value != this._left) {
			this._left = value
		}
		this.setDirty(this._cachedLeft !== null)
	}

	public setWidth(value: number | (<T extends this>(element: T) => number | null) | null | string) {
		if (this._width !== value) {
			if (typeof value == "string") {
				const match = value.match(/^(\d+)%$/)
				if (!match) {
					throw new Error(`unknown width format: ${value}`)
				}
				const amount = (parseInt(match[1], 10) / 100)
				this._height = element => element._parent!.computedWidth * amount
			} else {
				this._width = value
			}
			this.setDirty(this._cachedWidth !== null)
		}
	}

	public setHeight(value: number | (<T extends this>(element: T) => number | null) | null | string) {
		if (this._height !== value) {
			if (typeof value == "string") {
				const match = value.match(/^(\d+)%$/)
				if (!match) {
					throw new Error(`unknown height format: ${value}`)
				}
				const amount = (parseInt(match[1], 10) / 100)
				this._height = element => element._parent!.computedHeight * amount
			} else {
				this._height = value
			}
			this.setDirty(this._cachedHeight !== null)
		}
	}

	public setAnchor(x: number, y?: number) {
		const yValue = y === undefined ? x : y
		if (this._xAnchor != x || this._yAnchor != yValue) {
			this._xAnchor = x
			this._yAnchor = yValue
			this.setDirty()
		}
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

	public get hasParent() {
		return this._parent != null
	}

	public get parent() {
		if (!this._parent) {
			throw new Error("layout parent is null!")
		}
		return this._parent
	}

	public get contentWidth() {
		return 0
	}

	public get contentHeight() {
		return 0
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

	public get margin(): Readonly<ResolvedPositioningBox> {
		return this._margin
	}

	public set margin(value: Readonly<ResolvedPositioningBox>) {
		Object.assign(this._margin, value)
		this.setDirty()
	}

	public get marginTop() {
		return this._margin.top
	}

	public set marginTop(value: number) {
		if (this._margin.top != value) {
			this._margin.top = value
			this.setDirty()
		}
	}

	public get marginBottom() {
		return this._margin.bottom
	}

	public set marginBottom(value: number) {
		if (this._margin.bottom != value) {
			this._margin.bottom = value
			this.setDirty()
		}
	}

	public get marginLeft() {
		return this._margin.left
	}

	public set marginLeft(value: number) {
		if (this._margin.left != value) {
			this._margin.left = value
			this.setDirty()
		}
	}

	public get marginRight() {
		return this._margin.right
	}

	public set marginRight(value: number) {
		if (this._margin.right != value) {
			this._margin.right = value
			this.setDirty()
		}
	}

	public get padding(): Readonly<ResolvedPositioningBox> {
		return this._padding
	}

	public set padding(value: Readonly<ResolvedPositioningBox>) {
		Object.assign(this._padding, value)
		this.setDirty()
	}

	public get paddingTop() {
		return this._padding.top
	}

	public set paddingTop(value: number) {
		if (this._padding.top != value) {
			this._padding.top = value
			this.setDirty()
		}
	}

	public get paddingBottom() {
		return this._padding.bottom
	}

	public set paddingBottom(value: number) {
		if (this._padding.bottom != value) {
			this._padding.bottom = value
			this.setDirty()
		}
	}

	public get paddingLeft() {
		return this._padding.left
	}

	public set paddingLeft(value: number) {
		if (this._padding.left != value) {
			this._padding.left = value
			this.setDirty()
		}
	}

	public get paddingRight() {
		return this._padding.right
	}

	public set paddingRight(value: number) {
		if (this._padding.right != value) {
			this._padding.right = value
			this.setDirty()
		}
	}

	public get volatile() {
		return this._volatile
	}

	public set volatile(value: boolean) {
		if (this._volatile != value) {
			this._volatile = value
			if (value) {
				this.setDirty()
			}
		}
	}

	public get ignoreLayout() {
		return this._ignoreLayout
	}

	public set ignoreLayout(value: boolean) {
		if (this._ignoreLayout != value) {
			this._ignoreLayout = value
			this.setDirty()
		}
	}

	public get flexMode() {
		return this._flexMode
	}

	public set flexMode(value: "none" | "horizontal" | "vertical") {
		if (this._flexMode != value) {
			this._flexMode = value
			this.setDirty()
		}
	}

	public get flexHorizontalAlign() {
		return this._flexHorizontalAlign
	}

	public set flexHorizontalAlign(value: "left" | "right" | "center") {
		if (this._flexHorizontalAlign != value) {
			this._flexHorizontalAlign = value
			this.setDirty()
		}
	}

	public get flexVerticalAlign() {
		return this._flexVerticalAlign
	}

	public set flexVerticalAlign(value: "top" | "bottom" | "middle") {
		if (this._flexVerticalAlign != value) {
			this._flexVerticalAlign = value
			this.setDirty()
		}
	}

	public get flexGrow() {
		return this._flexGrow
	}

	public set flexGrow(value: number) {
		if (this._flexGrow != value) {
			this._flexGrow = value
			this.setDirty()
		}
	}

	public get enabled() {
		return this._enabled
	}

	public set enabled(value: boolean) {
		if (this._enabled != value) {
			this._enabled = value
			this.onEnableStateChange(value)
			if (value) {
				this.setDirty()
				if (this.onEnable) {
					this.onEnable()
				}
			} else {
				if (this.onDisable) {
					this.onDisable()
				}
			}
		}
	}

	public get parentLayout() {
		return this._parent ? this._parent._flexMode : "none"
	}

	public get top(): number {
		return typeof this._top == "number" ? this._top : 0
	}

	public set top(value: number) {
		if (this._top != value) {
			this._top = value
		}
		this.setDirty(this._cachedTop !== null)
	}

	public get computedTop() {
		if (this._cachedTop !== null) {
			return this._cachedTop
		}
		let value = typeof this._top == "function" ? this._top(this as any) : this._top
		if (this._yOrigin) {
			value += this._yOrigin * this._parent!.computedHeight
		}
		if (this._yAnchor) {
			value -= this._yAnchor * this._scale * this.computedHeight
		}
		this._cachedTop = value
		return value
	}

	public get left(): number {
		return typeof this._left == "number" ? this._left : 0
	}

	public set left(value: number) {
		if (value != this._left) {
			this._left = value
		}
		this.setDirty(this._cachedLeft !== null)
	}

	public get computedLeft() {
		if (this._cachedLeft !== null) {
			return this._cachedLeft
		}
		let value = typeof this._left == "function" ? this._left(this as any) : this._left
		if (this._xOrigin) {
			value += this._xOrigin * this._parent!.computedWidth
		}
		if (this._xAnchor) {
			value -= this._xAnchor * this._scale * this.computedWidth
		}
		this._cachedLeft = value
		return value
	}

	public get innerTop() {
		return this.computedTop + this._margin.top + this._padding.top
	}

	public get innerLeft() {
		return this.computedLeft + this._margin.left + this._padding.left
	}

	public get width(): number {
		return typeof this._width == "number" ? this._width : 0
	}

	public set width(value: number) {
		if (this._width !== value) {
			this._width = value
			this.setDirty(this._cachedWidth !== null)
		}
	}

	public get computedWidth() {
		if (this._cachedWidth === null) {
			let value
			if (typeof this._width == "function") {
				value = this._width(this as any)
			} else if (this._width) {
				value = this._width
			} else if (this._width === 0) {
				value = 0
			} else {
				if (this._flexMode == "none") {
					if ((this._flexGrow > 0) && (this.parentLayout == "horizontal")) {
						value = 0
					} else {
						value = this.contentWidth
					}
				} else if (this._flexMode == "horizontal") {
					value = this.childrenWidth + this._padding.left + this._padding.right
				} else {
					this.resolveLayout()
					value = this.childrenMaxWidth
				}
			}
			if (this._xFill && value !== null) {
				value += this._parent!.computedWidth * this._xFill
			}
			this._cachedWidth = value
			return value || 0
		} else {
			return this._cachedWidth
		}
	}

	public get outerWidth() {
		return this.computedWidth + this._margin.left + this._margin.right
	}

	public get innerWidth() {
		return this.computedWidth - this._padding.left - this._padding.right
	}

	public get height(): number {
		return typeof this._height == "number" ? this._height : 0
	}

	public set height(value: number) {
		if (this._height !== value) {
			this._height = value
			this.setDirty(this._cachedHeight !== null)
		}
	}

	public get computedHeight(): number {
		if (this._cachedHeight === null) {
			let value
			if (typeof this._height == "function") {
				value = this._height(this as any)
			} else if (this._height) {
				value = this._height
			} else if (this._height === 0) {
				value = 0
			} else {
				if (this._flexMode == "none") {
					if ((this._flexGrow > 0) && (this.parentLayout == "vertical")) {
						value = 0
					} else {
						value = this.contentHeight
					}
				} else if (this._flexMode == "horizontal") {
					this.resolveLayout()
					value = this.childrenMaxHeight
				} else {
					value = this.childrenHeight + this._padding.top + this._padding.bottom
				}
			}
			if (this._yFill && value !== null) {
				value += this._parent!.computedHeight * this._yFill
			}
			this._cachedHeight = value
			return value || 0
		} else {
			return this._cachedHeight
		}
	}

	public get outerHeight() {
		return this.computedHeight + this._margin.top + this._margin.bottom
	}

	public get innerHeight() {
		return this.computedHeight - this._padding.top - this._padding.bottom
	}

	public set scale(value: number) {
		if (this._scale != value) {
			this._scale = value
			this.onScaleChange(this._parentScale)
			this.setDirty()
		}
	}

	public get scale() {
		return this._scale
	}

	public get xAnchor() {
		return this._xAnchor
	}

	public set xAnchor(value: number) {
		if (this._xAnchor != value) {
			this._xAnchor = value
			this.setDirty()
		}
	}

	public get yAnchor() {
		return this._yAnchor
	}

	public set yAnchor(value: number) {
		if (this._yAnchor != value) {
			this._yAnchor = value
			this.setDirty()
		}
	}

	public get anchor() {
		return [this._xAnchor, this.yAnchor] as Readonly<[number, number]>
	}

	public set anchor(value: Readonly<[number, number]>) {
		if (this._xAnchor != value[0] || this._yAnchor != value[1]) {
			this._xAnchor = value[0]
			this._yAnchor = value[1]
			this.setDirty()
		}
	}

	public get globalScale() {
		return this._scale * this._parentScale
	}

	public get xOrigin() {
		return this._xOrigin
	}

	public set xOrigin(value: number) {
		if (this._xOrigin != value) {
			this._xOrigin = value
			this.setDirty()
		}
	}

	public get yOrigin() {
		return this._yOrigin
	}

	public set yOrigin(value: number) {
		if (this._yOrigin != value) {
			this._yOrigin = value
			this.setDirty()
		}
	}

	public get xFill() {
		return this._xFill
	}

	public set xFill(value: number) {
		if (this._xFill != value) {
			this._xFill = value
			this.setDirty()
		}
	}

	public get yFill() {
		return this._yFill
	}

	public set yFill(value: number) {
		if (this._yFill != value) {
			this._yFill = value
			this.setDirty()
		}
	}

	public get globalBoundingBox() {
		const result = {
			top: this.innerTop,
			left: this.innerLeft,
			width: 0,
			height: 0
		}
		if (this._width == null && this.flexMode == "none") {
			const bounds = this.horizontalBounds
			result.left -= result.left - bounds[0]
			result.width = bounds[1] - bounds[0]
		} else {
			result.width = this.innerWidth * this._scale
		}
		if (this._height == null && this.flexMode == "none") {
			const bounds = this.verticalBounds
			result.top -= result.top - bounds[0]
			result.height = bounds[1] - bounds[0]
		} else {
			result.height = this.innerHeight * this._scale
		}
		let parent = this._parent
		while (parent) {
			if (parent._scale) {
				result.top = (result.top * parent._scale) + parent.innerTop
				result.left = (result.left * parent._scale) + parent.innerLeft
				result.width *= parent._scale
				result.height *= parent._scale
			} else {
				result.top += parent.innerTop
				result.left += parent.innerLeft
			}
			parent = parent._parent
		}
		return result
	}

	public get horizontalBounds() {
		const width = this.computedWidth * this.scale
		const offset = this.innerLeft
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
		min *= this.scale
		max *= this.scale
		return isFinite(min + max) ? [offset + min, offset + max] : [offset, offset]
	}

	public get verticalBounds() {
		const height = this.computedHeight * this.scale
		const offset = this.innerTop
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
		min *= this.scale
		max *= this.scale
		return isFinite(min + max) ? [offset + min, offset + max] : [offset, offset]
	}

	public get layoutReady() {
		return this._layoutReady
	}

	public get widthReady() {
		return (this._cachedWidth !== null) || (this._width !== null && (this.ignoreLayout || !this._parent || this.parent.flexMode != "horizontal"))
	}

	public get heightReady() {
		return (this._cachedHeight !== null) || (this._height !== null && (this.ignoreLayout || !this._parent || this.parent.flexMode != "vertical"))
	}

	public get hasWidth() {
		return this._width !== null
	}

	public get hasHeight() {
		return this._height !== null
	}

	public get isLayoutElement() {
		return !(this.ignoreLayout || !this._parent || this.parent.flexMode == "none")
	}

	public get parentIndex() {
		return this._parent ? this._parent.children.indexOf(this as any) : -1
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
