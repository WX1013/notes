# Docker镜像的导入导出

### 导出镜像到本地

```shell
# 拉取远程镜像保存到本地
docker save -o xxx.tar IMAGE_NAME:TAB
# 保存本地镜像到本地
docker save -o xxx.tar IMAGE_ID
```

### 把本地镜像文件导入

```shell
docker load < hangge_server.tar
```

