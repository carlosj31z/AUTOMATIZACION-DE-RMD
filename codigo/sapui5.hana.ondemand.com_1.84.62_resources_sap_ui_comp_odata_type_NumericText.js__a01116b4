/*
 * ! SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
sap.ui.define(["sap/ui/core/Core","sap/ui/core/library","sap/ui/comp/smartfield/type/String"],function(C,c,S){"use strict";var N=S.extend("sap.ui.comp.odata.type.NumericText",{constructor:function(f,o){S.call(this,f,o);this.oCustomRegex=new RegExp("^[0]*$");}});N.prototype.parseValue=function(v,s){if(this.oCustomRegex.test(v)){if(typeof this.oFieldControl==="function"){this.oFieldControl(v,s);}return null;}return S.prototype.parseValue.apply(this,arguments);};N.prototype.formatValue=function(v){if(this.oCustomRegex.test(v)){return null;}return S.prototype.formatValue.apply(this,arguments);};N.prototype.destroy=function(){S.prototype.destroy.apply(this,arguments);};return N;});
