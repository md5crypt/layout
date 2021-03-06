export type Typify<T> = { [ K in keyof T ]: T[ K ] }
export type ElementTypeNode = Record<string, {config: any, element: LayoutElement<any>}>

type CollectElementTypes<T extends ElementTypeNode> = {
	[K in keyof T]: {
		type: K
		name?: string
		config?: T[K]["config"]
		layout?: LayoutConfig<T[K]["element"]>
	}
}

export type LayoutElementJson<T extends ElementTypeNode> = CollectElementTypes<T>[keyof CollectElementTypes<T>] & {children?: LayoutElementJson<T>[]}

interface InternalPositioningBox {
	top: number
	left: number
	bottom: number
	right: number
}

type ConfigCallback<T extends LayoutElement<any>, K = number> = (element: LayoutElement<T>) => K

interface InternalLayoutConfig<T extends LayoutElement<any>> {
	top: number | ConfigCallback<T>
	left: number | ConfigCallback<T>
	width?: number | ConfigCallback<T, number | null>
	height?: number | ConfigCallback<T, number | null>
	padding: InternalPositioningBox
	margin: InternalPositioningBox
	flexMode: "none" | "horizontal" | "vertical"
	flexHorizontalAlign: "left" | "right" | "center"
	flexVerticalAlign: "top" | "bottom" | "middle"
	flexGrow: number
	ignoreLayout: boolean
}

type PositioningBox = Readonly<(Partial<InternalPositioningBox> & {vertical?: number, horizontal?: number}) | number>

interface LayoutConfigOverride<T extends LayoutElement<any>> {
	padding: PositioningBox
	margin: PositioningBox
	top: number | ConfigCallback<T> | string
	left: number | ConfigCallback<T> | string
	width: number | ConfigCallback<T, number | null> | string
	height: number | ConfigCallback<T, number | null> | string
	enabled: boolean
}

export type LayoutConfig<T extends LayoutElement<any>> =  Readonly<Partial<Omit<InternalLayoutConfig<T>, keyof LayoutConfigOverride<T>> & LayoutConfigOverride<T>>>

export abstract class LayoutElement<T extends LayoutElement<any>> {
	public readonly name?: string
	public readonly children: T[]

	protected readonly config: InternalLayoutConfig<T>
	protected _parent: T | null
	protected _width: number | null
	protected _height: number | null
	protected _enabled: boolean

	private readonly childrenMap: Map<string, T>
	private dirty: boolean
	private layoutReady: boolean
	private _top: number | null
	private _left: number | null

	public constructor(name?: string) {
		this.config = {
			top: 0,
			left: 0,
			padding: {top: 0, left: 0, bottom: 0, right: 0},
			margin: {top: 0, left: 0, bottom: 0, right: 0},
			flexMode: "none",
			flexHorizontalAlign: "left",
			flexVerticalAlign: "top",
			flexGrow: 0,
			ignoreLayout: false
		}
		this._parent = null
		this._top = null
		this._left = null
		this._width = null
		this._height = null
		this._enabled = true
		this.dirty = true
		this.layoutReady = false
		this.name = name
		this.children = []
		this.childrenMap = new Map()
	}

	private nameAdd(element: T) {
		if (this.name) {
			this.childrenMap.set(element.name!, element)
		} else {
			this.parent.nameAdd(element)
		}
	}

	private nameRemove(element: T) {
		if (this.name) {
			this.childrenMap.delete(element.name!)
		} else {
			this.parent.nameRemove(element)
		}
	}

	private removeElement(element: T): boolean
	private removeElement(index: number): boolean
	private removeElement(arg: T | number) {
		const element = typeof arg == "number" ? this.children[arg] : arg
		const index = typeof arg == "number" ? arg :this.children.indexOf(element)
		if (index >= 0) {
			if (element.name && (element.name[0] != "@")) {
				this.nameRemove(element)
			}
			this.onRemoveElement(index)
			this.children.splice(index, 1)
			this.setDirty()
			return true
		}
		return false
	}

	private get childrenHeight(): number {
		return this.children.reduce((value, element) => value + (element.config.ignoreLayout || !element._enabled ? 0 : element.outerHeight), 0)
	}

	private get childrenMaxHeight(): number {
		return this.children.reduce((value, element) => Math.max(value, (element.config.ignoreLayout || !element._enabled ? 0 : element.outerHeight)), 0)
	}

	private get childrenWidth(): number {
		return this.children.reduce((value, element) => value + (element.config.ignoreLayout || !element._enabled ? 0 : element.outerWidth), 0)
	}

	private get childrenMaxWidth(): number {
		return this.children.reduce((value, element) => Math.max(value, (element.config.ignoreLayout || !element._enabled ? 0 : element.outerWidth)), 0)
	}

	protected get configTop() {
		const value = this.config.top
		return typeof value == "function" ? value(this) : value
	}

	protected get configLeft() {
		const value = this.config.left
		return typeof value == "function" ? value(this) : value
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
		if (this.layoutReady || this.config.flexMode == "none") {
			this.layoutReady = true
			return // nothing to do
		}
		let growCount = this.children.reduce((value, element) => value + (element._enabled ? element.config.flexGrow : 0), 0)
		if (this.config.flexMode == "horizontal") {
			const width = this.innerWidth
			let growPool = width - this.childrenWidth
			let xOffset = this.config.padding.left
			if (!growCount && (this.config.flexHorizontalAlign != "left")) {
				xOffset += this.config.flexHorizontalAlign == "center" ? growPool / 2 : growPool
			}
			const growFactor = growCount ? growPool / growCount : 0
			for (const element of this.children) {
				if (!element._enabled || element.config.ignoreLayout) {
					continue
				}
				if (element.config.flexGrow) {
					const amount = growCount > 1 ? Math.floor(growFactor * element.config.flexGrow) : growPool
					growCount -= 1
					growPool -= amount
					element._width = element.width + amount
					element._height = null
				}
				element._top = this.config.padding.top + element.configTop
				element._left = xOffset + element.configLeft
				element.dirty = true
				xOffset += element.outerWidth
			}
			this.layoutReady = true
			const height = this.innerHeight
			for (const element of this.children) {
				if (this._enabled && !element.config.ignoreLayout && (this.config.flexVerticalAlign != "top")) {
					const diff = height - element.outerHeight
					element._top! += this.config.flexVerticalAlign == "middle" ? diff / 2 : diff
				}
			}
		} else {
			const height = this.innerHeight
			let growPool = height - this.childrenHeight
			let yOffset = this.config.padding.top
			if (!growCount && (this.config.flexVerticalAlign != "top")) {
				yOffset += this.config.flexVerticalAlign == "middle" ? growPool / 2 : growPool
			}
			const growFactor = growCount ? growPool / growCount : 0
			for (const element of this.children) {
				if (!element._enabled || element.config.ignoreLayout) {
					continue
				}
				if (element.config.flexGrow) {
					const amount = growCount > 1 ? Math.floor(growFactor * element.config.flexGrow) : growPool
					growCount -= 1
					growPool -= amount
					element._height = element.height + amount
					element._width = null
				}
				element._left = element.configLeft + this.config.padding.left
				element._top = yOffset + element.configTop
				element.dirty = true
				yOffset += element.outerHeight
			}
			this.layoutReady = true
			const width = this.innerWidth
			for (const element of this.children) {
				if (this._enabled && !element.config.ignoreLayout && (this.config.flexHorizontalAlign != "left")) {
					const diff = width - element.outerWidth
					element._left! += this.config.flexHorizontalAlign == "center" ? diff / 2 : diff
				}
			}
		}
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

	protected setDirty() {
		if (!this.dirty) {
			this._top = null
			this._left = null
			this._width = null
			this._height = null
			this.dirty = true
			this.layoutReady = false
			for (const child of this.children) {
				child.setDirty()
			}
			if (this.parentLayout != "none") {
				this._parent!.setDirty()
			}
		}
	}

	public update() {
		if (this._enabled) {
			if (this.dirty) {
				this.resolveLayout()
			}
			this.children.forEach(element => element.update())
		}
		if (this.dirty) {
			this.dirty = false
			this.onUpdate()
		}
	}

	public get enabled() {
		return this._enabled
	}

	public set enabled(value: boolean) {
		if (this._enabled != value) {
			this._enabled = value
			this.setDirty()
		}
	}

	public get parentLayout() {
		return this._parent ? this._parent.config.flexMode : "none"
	}

	public get top() {
		return (this._top !== null ? this._top : this.configTop) + this.config.margin.top
	}

	public set top(value: number) {
		this.config.top = value
		this.setDirty()
	}

	public get left() {
		return (this._left !== null ? this._left : this.configLeft) + this.config.margin.left
	}

	public set left(value: number) {
		this.config.left = value
		this.setDirty()
	}

	public get width(): number {
		if (this._width === null) {
			if (typeof this.config.width == "function") {
				this._width = this.config.width(this)
			} else if (this.config.width) {
				this._width = this.config.width
			} else if (this.config.width === 0) {
				return 0
			} else {
				if (this.config.flexMode == "none") {
					if ((this.config.flexGrow > 0) && (this.parentLayout == "horizontal")) {
						return 0
					}
					this._width = this.contentWidth
				} else if (this.config.flexMode == "horizontal") {
					this._width = this.childrenWidth
				} else {
					this.resolveLayout()
					this._width = this.childrenMaxWidth
				}
				this._width += this.config.padding.left + this.config.padding.right
			}
		}
		return this._width || 0
	}

	public get outerWidth() {
		return this.width + this.config.margin.left + this.config.margin.right
	}

	public get innerWidth() {
		return this.width - this.config.padding.left - this.config.padding.right
	}

	public get height(): number {
		if (this._height === null) {
			if (typeof this.config.height == "function") {
				this._height = this.config.height(this)
			} else if (this.config.height) {
				this._height = this.config.height
			} else if (this.config.height === 0) {
				return 0
			} else {
				if (this.config.flexMode == "none") {
					if ((this.config.flexGrow > 0) && (this.parentLayout == "vertical")) {
						return 0
					}
					this._height = this.contentHeight
				} else if (this.config.flexMode == "horizontal") {
					this.resolveLayout()
					this._height = this.childrenMaxHeight
				} else {
					this._height = this.childrenHeight
				}
				this._height += this.config.padding.top + this.config.padding.bottom
			}
		}
		return this._height || 0
	}

	public get outerHeight() {
		return this.height + this.config.margin.top + this.config.margin.bottom
	}

	public get innerHeight() {
		return this.height - this.config.padding.top - this.config.padding.bottom
	}

	public get widthReady() {
		return (this._width !== null) || (this.config.width !== undefined)
	}

	public get heightReady() {
		return (this._height !== null) || (this.config.height !== undefined)
	}

	public updateConfig(config: LayoutConfig<T>) {
		Object.assign(this.config, config)
		for (const key of ["padding", "margin"] as const) {
			if (key in config) {
				const value = config[key]!
				if (typeof value == "number") {
					this.config[key] = {top: value, left: value, bottom: value, right: value}
				} else {
					this.config[key] = {
						top: value.top === undefined ? (value.vertical || 0) : value.top,
						left: value.left === undefined ? (value.horizontal || 0) : value.left,
						bottom: value.bottom === undefined ? (value.vertical || 0) : value.bottom,
						right: value.right === undefined ? (value.horizontal || 0) : value.right
					}
				}
			}
		}
		for (const key of ["width", "height"] as const) {
			if (key in config && typeof config[key] == "string") {
				const match = (config[key] as string).match(/^(\d+)%$/)
				if (!match) {
					throw new Error(`unknown ${key} format: ${config[key]}`)
				}
				const scale = parseInt(match[1], 10) / 100
				if (key == "width") {
					this.config.width = element => element.parent.widthReady ? (element.parent.innerWidth * scale) : null
				} else {
					this.config.height = element => element.parent.heightReady ? (element.parent.innerHeight * scale) : null
				}
			}
		}
		if (config.enabled !== undefined) {
			this._enabled = config.enabled
		}
		this.setDirty()
	}

	public getElement<K extends T>(name: string): K {
		if (!this.name) {
			return this.parent.getElement<K>(name)
		}
		const path = name.split(".")
		let child: LayoutElement<any> | undefined = this
		for (let i = 0; i < path.length; i++) {
			child = child.childrenMap.get(path[i])
			if (!child) {
				throw new Error(`could not resolve '${name}'`)
			}
		}
		return child as K
	}

	public insertElement(element: T, before?: T | string) {
		if (before) {
			const searchResult = this.children.indexOf(typeof before == "string" ? this.getElement(before) : before)
			const index = searchResult >= 0 ? searchResult : this.children.length
			this.children.splice(index, 0, element)
			this.onInsertElement(element, index)
		} else {
			this.children.push(element)
			this.onInsertElement(element, this.children.length - 1)
		}
		if (element.name && (element.name[0] != "@")) {
			this.nameAdd(element)
		}
		element._parent?.removeElement(element)
		element._parent = this
		this.setDirty()
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
}

type LayoutConstructor = (name?: string, config?: Record<string, any>) => LayoutElement<any>

export class LayoutFactory<T extends LayoutElement<any>, K extends LayoutElementJson<any> = LayoutElementJson<any>> {
	private constructors: Map<string, LayoutConstructor> = new Map()

	public register(type: string, constructor: LayoutConstructor) {
		this.constructors.set(type, constructor)
	}

	public createElement(type: string, name?: string, config?: Record<string, any>): T {
		const constructor = this.constructors.get(type)
		if (!constructor) {
			throw new Error(`unknown layout type '${type}'`)
		}
		return constructor(name, config) as T
	}

	public create(json: K, parent?: T): T {
		const root = this.createElement(json.type, json.name, json.config)
		if (json.layout) {
			root.updateConfig(json.layout)
		}
		parent?.insertElement(root)
		if (json.children) {
			json.children.forEach(element => this.create(element as K, root))
		}
		return root
	}
}
