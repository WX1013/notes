# Rancher v2.8.5安装使用

## 1.服务器准备

| 服务器       | 配置情况                | 说明                           |
| ------------ | ----------------------- | ------------------------------ |
| 172.16.4.100 | 龙蜥 8.9（4C 8G 500G）  | Rancher管理节点                |
| 172.16.4.102 | 龙蜥 8.9（8C 16G 500G） | 集群master节点，也作为工作节点 |
| 172.16.4.102 | 龙蜥 8.9（8C 16G 500G） | 集群工作节点                   |

## 2.管理端安装

> Docker安装跳过，尽量使用较新版本的。

```shell
# 启用以下几个模块
modprobe overlay
modprobe br_netfilter
modprobe ip_tables
modprobe ip_conntrack
modprobe iptable_filter
modprobe ipt_state

# 配置重启后自动启用
cat > /etc/modules-load.d/rancher.conf <<EOF
overlay
br_netfilter
ip_tables
ip_conntrack
iptable_filter
ipt_state
EOF

# 1.拉取镜像
docker pull ctrimages.hzlinks.net/rancher/rancher:2.8.5
# 阿里云
docker pull registry.cn-hangzhou.aliyuncs.com/kevinyg/rancher:v2.8.4
# 2.启动容器
docker run -d --name rancher --restart=unless-stopped --privileged -v /data/rancher:/var/lib/rancher -p 443:443 -p 80:80 ctrimages.hzlinks.net/rancher/rancher:2.8.5
```

在`docker run`过程中会有拉取不到的情况，需要梯子，可下载`/data/rancher`压缩包，直接使用。【位置在OSS：/wangxinblog/linux/rancher/ 下】

启动成功后，可访问`https://172.16.4.100`进入页面，初始的登录密码可通过`docker logs rancher 2>&1 | grep "Bootstrap Password:"`获取密码。

![image-20240720133256898](https://file.iamwx.cn/images/image-20240720133256898.png)

如果local一开始状态不是正常的，继续等待即可。

## 3.添加集群

点击`创建`进入集群创建页面，选择自定义，如果需要可配置阿里云镜像仓库地址。

![image-20240720133625564](https://file.iamwx.cn/images/image-20240720133625564.png)

保存后，既可以获取添加node的命令，到其它节点上执行后等待即可。

