import { init } from './snabbdom';
import { attributesModule } from './modules/attributes'; // for setting attributes on DOM elements
import { classModule } from './modules/class'; // makes it easy to toggle classes
import { propsModule } from './modules/props'; // for setting properties on DOM elements
import { styleModule } from './modules/style'; // handles styling on elements with support for animations
import { eventListenersModule } from './modules/eventlisteners'; // attaches event listeners
import { h } from './h'; // helper function for creating vnodes

// 入口文件

// 初始化，传入需要更新的模块。
var patch = init([
    // Init patch function with choosen modules
    attributesModule,
    classModule,
    propsModule,
    styleModule,
    eventListenersModule
]) as (oldVNode: any, vnode: any) => any;

// 主要导出 snabbdomBundle , 主要包含两个函数，一个是 修补函数 ， 一个是 h 函数
export const snabbdomBundle = { patch, h: h as any };
export default snabbdomBundle;
