import service from "./axios";
import "antd/dist/antd.less";
import "./App.less";
import { message } from "antd";

const AMap = window.AMap;

let startPos = [116.379028, 39.865042];
let endPos = [116.427281, 39.903719];
let startPosMarker;
let endPosMarker;
let updateInterval;
let map;
let driving;
let user = {};
let carMarker;
let paused = false;

export function getUser() {
  return user;
}

function getPath(steps) {
  return steps.reduce((acc, current) => {
    const geo = current.path.map(p => [p.lng, p.lat]);
    return [...acc, ...geo];
  }, []);
}

export function setPaused(status) {
  paused = status;
}

function updateGeo([lng, lat]) {
  const geo = [
    {
      customerId: user.customerId,
      lng: lng,
      lat: lat
    }
  ];
  carMarker.moveTo([lng, lat], 100);
  message.success(JSON.stringify(geo));
  service({
    url: `/location`,
    method: "POST",
    data: geo,
    headers: {
      token: user.token
    }
  })
    .then(r => {
      if (r && r.Error) {
        throw r.Error;
      }
    })
    .catch(() => {
      clearInterval(updateInterval);
    });
}

export function init() {
  map = new AMap.Map("__map", {
    resizeEnable: true,
    center: [116.397428, 39.90923], //地图中心点
    zoom: 13 //地图显示的缩放级别
  });

  driving = new AMap.Driving({
    map: map,
    policy: AMap.DrivingPolicy.LEAST_TIME
  });

  const contextMenu = new AMap.ContextMenu();
  let contextMenuPositon;

  contextMenu.addItem(
    "设置为起点",
    function (e) {
      startPos = [contextMenuPositon.lng, contextMenuPositon.lat];
      if (startPosMarker) {
        startPosMarker.setPosition(contextMenuPositon);
      } else {
        startPosMarker = new AMap.Marker({
          map: map,
          position: contextMenuPositon //基点位置
        });
      }
    },
    1
  );

  contextMenu.addItem(
    "设置为终点",
    function (e) {
      endPos = [contextMenuPositon.lng, contextMenuPositon.lat];
      if (endPosMarker) {
        endPosMarker.setPosition(contextMenuPositon);
      } else {
        endPosMarker = new AMap.Marker({
          map: map,
          icon: "https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png",
          position: contextMenuPositon //基点位置
        });
      }
      drive();
    },
    2
  );

  //地图绑定鼠标右击事件——弹出右键菜单
  map.on("rightclick", function (e) {
    contextMenu.open(map, e.lnglat);
    contextMenuPositon = e.lnglat;
  });

  carMarker = new AMap.Marker({
    map: map,
    position: startPos,
    icon: "https://webapi.amap.com/images/car.png",
    offset: new AMap.Pixel(-26, -13),
    autoRotation: true,
    angle: -90
  });
}

export function drive() {
  clearInterval(updateInterval);
  carMarker.setPosition(startPos);
  driving.search(startPos, endPos, function (status, result) {
    if (status === "complete") {
      const paths = getPath(result.routes[0].steps);
      updateInterval = setInterval(() => {
        if (!paused) {
          const path = paths.shift();
          if (!path) {
            clearInterval(updateInterval);
            return;
          }
          updateGeo(path);
        }
      }, 2000);
    }
  });
}

export function destroy() {
  clearInterval(updateInterval);
}

export function setUser(c) {
  user = c;
}
