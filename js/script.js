const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${wsProtocol}//${window.location.host}:8080`);

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if(data.action === "update_orders"){
        updateOrders(data.orders);
    }else if(data.action === 'new_order'){
        addOrder('preparing', data.orderId);
    }else if(data.action === 'order_finished'){
        moveOrder(data.orderId, 'preparing', 'finished');
    }else if(data.action === 'order_removed'){
        removeOrder('finished', data.orderId);
    }
};

function updateOrders(orders){
    ['preparing', 'finished'].forEach((status) => {
        const container = document.querySelector(`.${status} .center`);
        container.innerHTML = '';
        orders[status].forEach((id) => addOrder(status, id));
    });
}

function addOrder(status, orderId){
    const container = document.querySelector(`.${status} .center`);
    const item = document.createElement('div');
    item.className = 'item';
    item.textContent = orderId;
    item.ondblclick = () => {
        if(status === 'preparing'){
            ws.send(JSON.stringify({action: 'move_to_finished', orderId}));
        }
        else if(status === 'finished'){
            ws.send(JSON.stringify({action: 'remove_order', orderId}));
        }
    };
    container.appendChild(item);
}

function moveOrder(orderId, fromStatus, toStatus){
    removeOrder(fromStatus, orderId);
    addOrder(toStatus, orderId);
}

function removeOrder(status, orderId){
    const container = document.querySelector(`.${status} .center`);
    const item = Array.from(container.children).find((el) => el.textContent === String(orderId));
    if(item) container.removeChild(item);
}
