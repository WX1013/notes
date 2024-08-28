# K8S配置应用自动扩缩容

### 1、前提条件

需要安装好Metrics Server，用于监控服务的资源使用情况

### 2、部署应用

创建一个 boot-demo.yaml 文件

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: boot-demo
  labels:
    app: boot-demo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: boot-demo
  template:
    metadata:
      labels:
        app: boot-demo
    spec:
      containers:
        - name: boot-demo
          image: registry.cn-hangzhou.aliyuncs.com/wxstudyk8s/boot-deploy-demo::latest
          imagePullPolicy: Always
          ports:
            - containerPort: 8099
              name: apiport
          resources:
            requests:
              cpu: 10m
              memory: 500Mi
            limits:
              cpu: 100m
              memory: 500Mi
      imagePullSecrets:
        - name: zyharbor
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app: boot-demo
  name: boot-demo
spec:
  selector:
    app: boot-demo
  ports:
    - port: 8099
      targetPort: 8099
  type: NodePort
```

部署应用

```shell
kubectl apply -f boot-demo.yaml
```

![image-20221111151008077](https://file.iamwx.cn/images/202211111510189.png)

### 3、创建HPA

* 命令行创建

```shell
# deploy 后面指定Deployment的名称；cpu-percent用于设置cpu阈值；min和max设置最小和最大的pod副本数量
kubectl autoscale deploy boot-demo --cpu-percent=20 --min=1 --max=5
```

* yaml文件创建

```yaml
apiVersion: autoscaling/v1
kind: HorizontalPodAutoscaler
metadata:
  name: boot-demo
spec:
	# 最大副本数
  maxReplicas: 5
  # 最小副本数
  minReplicas: 1
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: boot-demo
  # cpu使用率阈值
  targetCPUUtilizationPercentage: 20
```

### 4、验证弹性伸缩

#### 安装压测工具ab

```shell
yum -y install httpd-tools
# 输入ab后会打印命令帮助文档
ab
```

访问boot-demo的接口：http://ip:port/test

* ip可使用集群的任一节点的IP

* port可通过`kubectl get service` 查看boot-demo的节点端口

> ab的用法是：
> ab [options] [http/https]hostname[:port]/path
> 例如：ab -n 5000 -c 200 [http/https]hostname[:port]/index.php
> 上例表示总共访问index.php这个脚本5000次，200并发同时执行。
> ab常用参数的介绍：
> -n : 总共的请求执行数，缺省是1；
> -c : 并发数，缺省是1；
> -t : 测试所进行的总时间，秒为单位，缺省50000s
> -p : POST时的数据文件
> -w : 以HTML表的格式输出结果

#### 进行压测

##### 扩容

```shell
ab -n 10000 -c 200 http://192.168.18.11:32107/test
```

观察结果

```shell
kubectl get hpa
```

![image-20221111153151288](https://file.iamwx.cn/images/202211111531327.png)

* TARGETS左侧数值超过右侧设置的20%后，会开始扩容，当前已有5个pod在运行

![image-20221111153253676](https://file.iamwx.cn/images/202211111532713.png)

##### 缩容

在未继续请求时，TARGETS会降为正常，不需要做任何事情，静静等候至少5分钟，会看到pod数量降为min值。

