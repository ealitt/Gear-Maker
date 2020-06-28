class Gear {
    constructor(diametralPitch, numTeeth, pressureAngle) {
        this.diametralPitch = diametralPitch;
        this.numTeeth = numTeeth;
        this.pressureAngle = pressureAngle;

        this.pitchDiameter = this.numTeeth / this.diametralPitch;
        this.baseCircleDiameter = this.pitchDiameter * Math.cos(this.pressureAngle * Math.PI / 180);
        this.addendum = 1 / this.diametralPitch;
        this.dedendum = 1.25 / this.diametralPitch;
        this.addendumCircleDiameter = this.pitchDiameter + 2 * this.addendum;
        this.dedendumCircleDiameter = this.pitchDiameter - 2 * this.dedendum;
        this.clearance = this.dedendum - this.addendum;
        this.alpha = (Math.sqrt(Math.pow(this.pitchDiameter, 2) - Math.pow(this.baseCircleDiameter, 2)) / this.baseCircleDiameter - this.pressureAngle * (Math.PI / 180)) * (180 / Math.PI);

        this.paths = this.createPath();
        this.intersects = this.calculateIntersects();
        this.models = this.createGear();
    }

    createPath() {
        let path = [],
        addendumCirclePath = new makerjs.paths.Circle([0, 0], this.addendumCircleDiameter/2);

        // path.push(new makerjs.paths.Circle([0, 0], this.dedendumCircleDiameter/2));
        path.push(new makerjs.paths.Circle([0, 0], this.baseCircleDiameter/2));
        path.push(new makerjs.paths.Circle([0, 0], this.pitchDiameter/2));
        path.push(addendumCirclePath);

        return path
    }

    calculateIntersects() {
        let intersects = [];

        const phi1 = (Math.PI / 2) - this.alpha * (Math.PI / 180) - (360 / (4 * this.numTeeth) * (Math.PI / 180));
        const phi2 = (Math.PI / 2) + this.alpha * (Math.PI / 180) + (360 / (4 * this.numTeeth) * (Math.PI / 180));

        let xPrev = 0, 
        yPrev = 0,
        line,
        intercept;

        for(let t = 0; t <= 1; t += 0.01) {
            let x = ((this.baseCircleDiameter * 0.5 * (Math.cos(t + phi1) + t * Math.sin(t + phi1)))),
            y = this.baseCircleDiameter * 0.5 * (Math.sin(t + phi1) - t * Math.cos(t + phi1));

            line = new makerjs.paths.Line([xPrev, yPrev],[x,y]);

            if (intersects.length == 0) {
                intercept = makerjs.path.intersection(line, this.paths[0]);
                if(intercept) { intersects.push(intercept.intersectionPoints[0]) };
            }
            else if (intersects.length == 1) {
                intercept = makerjs.path.intersection(line, this.paths[1]);
                if(intercept) { intersects.push(intercept.intersectionPoints[0]) };
            } 
            else {
                intercept = makerjs.path.intersection(line, this.paths[2]);
                if(intercept) { intersects.push(intercept.intersectionPoints[0]) };
            }

            xPrev = x;
            yPrev = y;
        }

        return intersects
    }

    createInvoluteCurve() {
        let inv1CurvePoints = [],
        inv2CurvePoints = [],
        curvePoints = [],
        curve = [],
        // gearTeeth = { models: {} },
        gearTeeth = [],
        resolution = 0.1;

        const phi1 = (Math.PI / 2) - this.alpha * (Math.PI / 180) - (360 / (4 * this.numTeeth) * (Math.PI / 180));
        const phi2 = (Math.PI / 2) + this.alpha * (Math.PI / 180) + (360 / (4 * this.numTeeth) * (Math.PI / 180));

        for(let t = 0; t <= 1; t += resolution) {
            let x = ((this.baseCircleDiameter * 0.5 * (Math.cos(t + phi1) + t * Math.sin(t + phi1)))),
            y = this.baseCircleDiameter * 0.5 * (Math.sin(t + phi1) - t * Math.cos(t + phi1));

            if(t >= 0.2){ resolution = 0.02 };

            if(this.cartesianToPolar(x,y)[0] <= this.addendumCircleDiameter/2){
                inv1CurvePoints.push([x, y]);
            }
        }
        // add final point to connect first involute curve to addendum circle
        inv1CurvePoints.push(this.intersects[2]);

        resolution = 0.1;
        for(let t = 0; t <= 10; t += resolution) {
            let x = ((this.baseCircleDiameter * 0.5 * (Math.cos(-t + phi2) - t * Math.sin(-t + phi2)))),
            y = this.baseCircleDiameter * 0.5 * (Math.sin(-t + phi2) + t * Math.cos(-t + phi2));

            if(t >= 0.2){ resolution = 0.02 };

            if(this.cartesianToPolar(x,y)[0] <= this.addendumCircleDiameter/2){
                inv2CurvePoints.unshift([x, y]);
            }
        }

        inv2CurvePoints.unshift([-this.intersects[2][0],this.intersects[2][1]]);
        curvePoints = inv1CurvePoints.concat(inv2CurvePoints);

        // added lines for closing the tooth geometry
        let polar = this.cartesianToPolar(curvePoints[0][0], curvePoints[0][1]);
        curvePoints.unshift([(this.dedendumCircleDiameter/2) * Math.sin(polar[1]), (this.dedendumCircleDiameter/2) * Math.cos(polar[1])]);
        curvePoints.push([(this.dedendumCircleDiameter/2) * Math.sin(-polar[1]), (this.dedendumCircleDiameter/2) * Math.cos(-polar[1])]);


        curve = new makerjs.models.ConnectTheDots(false,curvePoints);

        let toothAngle = 90 + 360/(4*this.numTeeth)+this.alpha;
        let arc = new makerjs.models.EllipticArc(toothAngle, toothAngle + 360/(2*this.numTeeth)-this.alpha*2, this.dedendumCircleDiameter/2, this.dedendumCircleDiameter/2);
        
        let angle = 360 / this.numTeeth;
        for(let i = 0; i <= this.numTeeth; i++) {
            let toothClone = makerjs.cloneObject(curve);
            makerjs.model.rotate(toothClone, angle * i, [0, 0]);
            gearTeeth.push(toothClone);
        }
    
        for(let i = 0; i <= this.numTeeth; i++){
            let arcClone = makerjs.cloneObject(arc);
            let angle = 360 / this.numTeeth;
            makerjs.model.rotate(arcClone, angle * i, [0, 0]);
            gearTeeth.push(arcClone);
        }

        return gearTeeth
    }

    cartesianToPolar(x,y) {
        return [Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)), Math.atan(x/y)];
    }

    createGear() {
        let model;

        // model.push(this.createInvoluteCurve());
        model = this.createInvoluteCurve();
        
        return model
    }
}
