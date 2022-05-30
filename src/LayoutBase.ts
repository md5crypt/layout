export type ElementTypeNode = Record<string, {config: any, element: LayoutElement<any, LayoutElementJson>}>

type CollectElementTypes<T extends ElementTypeNode> = {
	[K in keyof T]: {
		type: K
		config?: T[K]["config"]
	}
}

export type LayoutElementJson<T extends ElementTypeNode = any> = CollectElementTypes<T>[keyof CollectElementTypes<T>] & {children?: LayoutElementJson<T>[]}

export interface ResolvedPositioningBox {
	top: number
	left: number
	bottom: number
	right: number
}

export type PositioningBox = Readonly<(Partial<ResolvedPositioningBox> & {vertical?: number, horizontal?: number}) | number>

export interface LayoutElementConfig<T extends LayoutElement<any, LayoutElementJson> = LayoutElement> {
	name?: string
	top?: number | ((element: T) => number)
	left?: number | ((element: T) => number)
	width?: number | ((element: T) => number | null) | string
	height?: number | ((element: T) => number | null) | string
	padding?: PositioningBox
	margin?: PositioningBox
	flexMode?: "none" | "horizontal" | "vertical"
	flexHorizontalAlign?: "left" | "right" | "center"
	flexVerticalAlign?: "top" | "bottom" | "middle"
	flexGrow?: number
	ignoreLayout?: boolean
	volatile?: boolean
	enabled?: boolean
	metadata?: Record<string, any>
	onUpdate?: (element: T) => void
	onBeforeLayoutResolve?: (element: T) => void
	onBeforeRedraw?: (element: T) => void
	onAfterRedraw?: (element: T) => void
	onEnable?: (element: T) => void
	onDisable?: (element: T) => void
	onDetach?: (element: T) => void
	onAttach?: (element: T) => void
}

export interface LayoutElementConstructorProperties<T extends LayoutElementConfig<any>> {
	factory: LayoutFactory
	type: string
	config?: T
}

export abstract class LayoutElement<T extends LayoutElement<T> = any, K extends LayoutElementJson = any> {
	public readonly type: string
	public readonly name?: string
	public readonly children: T[]
	public readonly factory: LayoutFactory
	public readonly metadata: Record<string, any>
	public readonly config: Readonly<LayoutElementConfig<T>>

	public onUpdateCallback?: (element: T) => void
	public onBeforeLayoutResolveCallback?: (element: T) => void
	public onBeforeRedrawCallback?: (element: T) => void
	public onAfterRedrawCallback?: (element: T) => void
	public onEnableCallback?: (element: T) => void
	public onDisableCallback?: (element: T) => void
	public onDetachCallback?: (element: T) => void
	public onAttachCallback?: (element: T) => void

	protected _parent: T | null

	private _cachedWidth: number | null
	private _cachedHeight: number | null
	private _cachedTop: number | null
	private _cachedLeft: number | null
	private dirty: boolean

	protected _enabled: boolean
	protected _top: number | ((element: T) => number)
	protected _left: number | ((element: T) => number)
	protected _width: number | ((element: T) => number | null) | null
	protected _height: number | ((element: T) => number | null) | null
	protected _padding: ResolvedPositioningBox
	protected _margin: ResolvedPositioningBox
	protected _flexMode: "none" | "horizontal" | "vertical"
	protected _flexHorizontalAlign: "left" | "right" | "center"
	protected _flexVerticalAlign: "top" | "bottom" | "middle"
	protected _flexGrow: number
	protected _ignoreLayout: boolean
	protected _volatile: boolean

	private readonly childrenMap: Map<string, LayoutElement<any, K>>
	private _layoutReady: boolean

	public static resolvePositioningBox(value: PositioningBox): ResolvedPositioningBox {
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

	public constructor(props: LayoutElementConstructorProperties<LayoutElementConfig<T>>) {
		this.factory = props.factory
		this.type = props.type
		this._top = 0
		this._left = 0
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
		this.dirty = true
		this._layoutReady = false
		this.children = []
		this.childrenMap = new Map()
		this.metadata = {}
		const config = props.config as LayoutElementConfig<LayoutElement<T, K>>
		this.config = config
		if (config) {
			this.name = config.name
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
		}
	}

	private nameAdd(element: LayoutElement<any, K>) {
		if (this.name) {
			this.childrenMap.set(element.name!, element)
		} else if (this._parent) {
			this._parent.nameAdd(element)
		}
	}

	private nameRemove(element: LayoutElement<any, K>) {
		if (this.name) {
			this.childrenMap.delete(element.name!)
		} else if (this._parent) {
			this._parent.nameRemove(element)
		}
	}

	private nameRemoveRecursion(element: T) {
		if (element.name) {
			if (element.name[0] != "@") {
				this.nameRemove(element)
			}
		} else {
			element.children.forEach(element => this.nameRemoveRecursion(element))
		}
	}

	private detachRecursion() {
		this.children.forEach(child => child.detachRecursion())
		if (this.onDetachCallback) {
			this.onDetachCallback(this as any)
		}
	}

	private removeElement(element: T): boolean
	private removeElement(index: number): boolean
	private removeElement(arg: T | number) {
		const element = typeof arg == "number" ? this.children[arg] : arg
		const index = typeof arg == "number" ? arg : this.children.indexOf(element)
		if (index >= 0) {
			this.nameRemoveRecursion(element)
			this.onRemoveElement(index)
			this.children.splice(index, 1)
			this.setDirty()
			this.detachRecursion()
			return true
		}
		return false
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

	protected onRemoveElement(_index: number) {
		// no-op by default
	}

	protected onInsertElement(_element: T, _index: number) {
		// no-op by default
	}

	protected onUpdate() {
		// no-op by default
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
				element.dirty = true
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
				element.dirty = true
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

	public get hasParent() {
		return this._parent != null
	}

	public get parent(): T {
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

	public setDirty(force?: boolean) {
		if (!this.dirty || force) {
			this._cachedTop = null
			this._cachedLeft = null
			this._cachedWidth = null
			this._cachedHeight = null
			this.dirty = true
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

	public forEach(callback: (element: T) => void) {
		callback(this as any)
		for (let i = 0; i < this.children.length; i += 1) {
			this.children[i].forEach(callback)
		}
	}

	public update() {
		if (this._enabled) {
			if (this.onUpdateCallback) {
				this.onUpdateCallback(this as any)
			}
			if (this.dirty) {
				if (this.onBeforeLayoutResolveCallback) {
					this.onBeforeLayoutResolveCallback(this as any)
				}
				this.resolveLayout()
				this.children.forEach(element => element.update())
				this.dirty = false
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

	public setMargin(value: PositioningBox) {
		this._margin = LayoutElement.resolvePositioningBox(value)
		this.setDirty()
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

	public setPadding(value: PositioningBox) {
		this._padding = LayoutElement.resolvePositioningBox(value)
		this.setDirty()
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

	private onEnableStateChange(value: boolean) {
		if (this._enabled) {
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
	}

	protected onEnable() {
		this.setDirty()
	}

	protected onDisable() {
		// empty by default
	}

	public get enabled() {
		return this._enabled
	}

	public set enabled(value: boolean) {
		if (this._enabled != value) {
			this._enabled = value
			this.onEnableStateChange(value)
			if (value) {
				this.onEnable()
			} else {
				this.onDisable()
			}
		}
	}

	public get parentLayout() {
		return this._parent ? this._parent._flexMode : "none"
	}

	public get top(): number {
		if (this._cachedTop !== null) {
			return this._cachedTop
		}
		const value = typeof this._top == "function" ? this._top(this as any) : this._top
		this._cachedTop = value
		return value
	}

	public set top(value: number) {
		if (this._top != value) {
			this._top = value
		}
		this.setDirty(this._cachedTop !== null)
	}

	public setTop(value: number | ((element: T) => number)) {
		if (this._top != value) {
			this._top = value
		}
		this.setDirty(this._cachedTop !== null)
	}

	public get left(): number {
		if (this._cachedLeft !== null) {
			return this._cachedLeft
		}
		const value = typeof this._left == "function" ? this._left(this as any) : this._left
		this._cachedLeft = value
		return value
	}

	public set left(value: number) {
		if (value != this._left) {
			this._left = value
		}
		this.setDirty(this._cachedLeft !== null)
	}

	public setLeft(value: number | ((element: T) => number)) {
		if (value != this._left) {
			this._left = value
		}
		this.setDirty(this._cachedLeft !== null)
	}

	public get innerTop() {
		return this.top + this._margin.top + this._padding.top
	}

	public get innerLeft() {
		return this.left + this._margin.left + this._padding.left
	}

	public setWidth(value: number | ((element: T) => number | null) | null | string) {
		if (this._width !== value) {
			if (typeof value == "string") {
				const match = value.match(/^(\d+)%$/)
				if (!match) {
					throw new Error(`unknown width format: ${value}`)
				}
				this._width = element => element._parent?.widthReady ? (element._parent.innerWidth * (parseInt(match[1], 10) / 100)) : null
			} else {
				this._width = value
			}
			this.setDirty(this._cachedWidth !== null)
		}
	}


	public set width(value: number) {
		if (this._width !== value) {
			this._width = value
			this.setDirty(this._cachedWidth !== null)
		}
	}

	public get width(): number {
		if (this._cachedWidth === null) {
			if (typeof this._width == "function") {
				this._cachedWidth = this._width(this as any)
			} else if (this._width) {
				this._cachedWidth = this._width
			} else if (this._width === 0) {
				return 0
			} else {
				if (this._flexMode == "none") {
					if ((this._flexGrow > 0) && (this.parentLayout == "horizontal")) {
						return 0
					}
					this._cachedWidth = this.contentWidth
				} else if (this._flexMode == "horizontal") {
					this._cachedWidth = this.childrenWidth + + this._padding.left + this._padding.right
				} else {
					this.resolveLayout()
					this._cachedWidth = this.childrenMaxWidth
				}
			}
		}
		return this._cachedWidth || 0
	}

	public get outerWidth() {
		return this.width + this._margin.left + this._margin.right
	}

	public get innerWidth() {
		return this.width - this._padding.left - this._padding.right
	}

	public setHeight(value: number | ((element: T) => number | null) | null | string) {
		if (this._height !== value) {
			if (typeof value == "string") {
				const match = value.match(/^(\d+)%$/)
				if (!match) {
					throw new Error(`unknown height format: ${value}`)
				}
				const amount = (parseInt(match[1], 10) / 100)
				this._height = element => element._parent!.height * amount
			} else {
				this._height = value
			}
			this.setDirty(this._cachedHeight !== null)
		}
	}

	public set height(value: number) {
		if (this._height !== value) {
			this._height = value
			this.setDirty(this._cachedHeight !== null)
		}
	}

	public get height(): number {
		if (this._cachedHeight === null) {
			if (typeof this._height == "function") {
				this._cachedHeight = this._height(this as any)
			} else if (this._height) {
				this._cachedHeight = this._height
			} else if (this._height === 0) {
				return 0
			} else {
				if (this._flexMode == "none") {
					if ((this._flexGrow > 0) && (this.parentLayout == "vertical")) {
						return 0
					}
					this._cachedHeight = this.contentHeight
				} else if (this._flexMode == "horizontal") {
					this.resolveLayout()
					this._cachedHeight = this.childrenMaxHeight
				} else {
					this._cachedHeight = this.childrenHeight + this._padding.top + this._padding.bottom
				}
			}
		}
		return this._cachedHeight || 0
	}

	public get outerHeight() {
		return this.height + this._margin.top + this._margin.bottom
	}

	public get innerHeight() {
		return this.height - this._padding.top - this._padding.bottom
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

	public getPath(root?: T) {
		if (this.name) {
			const result = [this.name]
			let parent = this._parent
			while (parent && parent != root) {
				if (parent.name) {
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
		const list = [this as any] as T[]
		let parent = this._parent
		while (parent) {
			list.push(parent)
			parent = parent._parent
		}
		return list.reverse()
	}

	public getRoot() {
		let element = this as LayoutElement
		while (true) {
			const parent = element._parent
			if (!parent || parent.type == "root") {
				return element as T
			}
			element = parent
		}
	}

	public isParentOf(child: T) {
		let parent = child._parent
		while (parent) {
			if (parent == this as LayoutElement) {
				return true
			}
			parent = parent._parent
		}
		return false
	}

	public getElement<L extends T>(name: string): L
	public getElement<L extends T>(name: string, noThrow: false): L
	public getElement<L extends T>(name: string, noThrow: true): L | null
	public getElement<L extends T>(name: string, noThrow = false): L | null {
		if (!this.name) {
			return this.parent.getElement<L>(name, noThrow as false)
		}
		const path = name.split(".")
		let current: LayoutElement<any, K> = this
		for (let i = 0; i < path.length; i++) {
			const child = current.childrenMap.get(path[i])
			if (!child) {
				if (noThrow) {
					return null
				}
				throw new Error(`could not resolve '${name}'`)
			}
			current = child
		}
		return current as L
	}

	public hasElement(name: string) {
		return this.getElement(name, true) != null
	}

	public replaceElement(element: T | K, old: T | string): T {
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

	public insertElement(element: T | K, before?: T | string | number): T {
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

	public insertElements(elements: (T | K)[], before?: T | string) {
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
}

type LayoutConstructor = (props: LayoutElementConstructorProperties<any>) => LayoutElement

export interface ElementClassInterface {
	register(layoutFactory: LayoutFactory): void
}

export class LayoutFactory<T extends LayoutElement = any, K extends LayoutElementJson = any> {
	private constructors: Map<string, LayoutConstructor> = new Map()

	public addElementClass(element: ElementClassInterface ) {
		element.register(this)
	}

	public addElementClasses(elements: ElementClassInterface[]) {
		elements.forEach(x => x.register(this))
	}

	public register(type: string, constructor: LayoutConstructor) {
		this.constructors.set(type, constructor)
	}

	public createElement(type: string, config?: LayoutElementConfig): T {
		const constructor = this.constructors.get(type)
		if (!constructor) {
			throw new Error(`unknown layout type '${type}'`)
		}
		return constructor({type, config, factory: this}) as T
	}

	public create(json: K, parent?: LayoutElement, before?: LayoutElement | string | number): T {
		const root = this.createElement(json.type, json.config)
		if (parent) {
			parent.insertElement(root, before)
		}
		if (json.children) {
			json.children.forEach(element => this.create(element as K, root))
		}
		if (root.onAttachCallback) {
			root.onAttachCallback(root)
		}
		return root
	}
}
