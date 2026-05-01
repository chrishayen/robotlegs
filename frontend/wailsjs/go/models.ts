export namespace main {
	
	export class Connection {
	    id: string;
	    fromNode: string;
	    fromPort: string;
	    toNode: string;
	    toPort: string;
	    label?: string;
	    color?: string;
	
	    static createFrom(source: any = {}) {
	        return new Connection(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.fromNode = source["fromNode"];
	        this.fromPort = source["fromPort"];
	        this.toNode = source["toNode"];
	        this.toPort = source["toPort"];
	        this.label = source["label"];
	        this.color = source["color"];
	    }
	}
	export class Port {
	    name: string;
	    color: string;
	
	    static createFrom(source: any = {}) {
	        return new Port(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.color = source["color"];
	    }
	}
	export class DiagramNode {
	    id: string;
	    x: number;
	    y: number;
	    title: string;
	    dotColor: string;
	    type: string;
	    tech: string;
	    description: string;
	    inputs?: Port[];
	    outputs?: Port[];
	
	    static createFrom(source: any = {}) {
	        return new DiagramNode(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.x = source["x"];
	        this.y = source["y"];
	        this.title = source["title"];
	        this.dotColor = source["dotColor"];
	        this.type = source["type"];
	        this.tech = source["tech"];
	        this.description = source["description"];
	        this.inputs = this.convertValues(source["inputs"], Port);
	        this.outputs = this.convertValues(source["outputs"], Port);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

