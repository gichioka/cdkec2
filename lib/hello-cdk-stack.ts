import { Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class HelloCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

   const vpc = new ec2.Vpc(this,"test-vpc",{
     cidr:"10.0.0.0/16",
     natGateways:2,
     maxAzs:2,
     subnetConfiguration:[
       {
         cidrMask:24,
         name:'Pubic',
         subnetType: ec2.SubnetType.PUBLIC
       },{
         cidrMask:24,
         name:'Private',
         subnetType: ec2.SubnetType.PRIVATE
       },{
         cidrMask:24,
         name:'Isolated',
         subnetType: ec2.SubnetType.ISOLATED
       }
     ]
   })
   const albSecurityGroup = new ec2.SecurityGroup(this,"alb-sg",{
    vpc: vpc
   });
   albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(),ec2.Port.tcp(80))

   const ec2SecurityGroup=new ec2.SecurityGroup(this,"ec2-sg",{
     vpc: vpc
   });
   ec2SecurityGroup.addIngressRule(albSecurityGroup,ec2.Port.tcp(80))

   const userData = ec2.UserData.forLinux({ shebang: '#!/bin/bash -xe' })
   userData.addCommands(
     'sudo yum update -y',
     'sudo yum -y install httpd',
     'echo "<html><head><title>CDKTest</title></head><body>Hello,AWSCDK</body></html>" > /var/www/html/index.html',
     'sudo service httpd start')

   const autoScalingGroup = new autoscaling.AutoScalingGroup(this, 'ec2-asg', {
   vpc,
   instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
   machineImage: new ec2.AmazonLinuxImage(),
   desiredCapacity: 2,
   userData: userData,
   maxCapacity: 3,
   securityGroup: ec2SecurityGroup,
   associatePublicIpAddress: false,
   vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE }
});
 
   const applicationLoadBalancer = new elb.ApplicationLoadBalancer(this, 'alb'
, {
   vpc,
   internetFacing: true,
   vpcSubnets: {subnetType: ec2.SubnetType.PUBLIC},
   securityGroup: albSecurityGroup,
});

const targetGroup = new elb.ApplicationTargetGroup(this, 'tg', {
      protocol: elb.ApplicationProtocol.HTTP,
      targetGroupName: 'alb-tg',
      vpc,
    });
const listener = applicationLoadBalancer.addListener('Listener', {
      port: 80,
      open: true,
  });
listener.addTargets('ApplicationFleet', {
      port: 80,
      targets: [autoScalingGroup]
});
  }
} 
